import fs from 'node:fs/promises'
import path from 'node:path'
import agPsd from 'ag-psd'
import { createCanvas as createNodeCanvas, ImageData } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const { readPsd, initializeCanvas } = agPsd
initializeCanvas(createNodeCanvas, (width, height) => new ImageData(width, height))

const base = '/Users/lwjun/.openclaw/workspace/archive/projects/image-convert-tool-hub/web/tmp-verification'

async function probePsd(rel) {
  const file = path.join(base, rel)
  try {
    const buf = await fs.readFile(file)
    const psd = readPsd(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
      skipLayerImageData: true,
      skipCompositeImageData: false,
      useImageData: false,
    })
    return {
      rel,
      ok: true,
      width: psd.width,
      height: psd.height,
      hasChildren: Array.isArray(psd.children) ? psd.children.length : 0,
      hasImageData: !!psd.imageData,
      bitsPerChannel: psd.bitsPerChannel ?? null,
      colorMode: psd.colorMode ?? null,
    }
  } catch (error) {
    return { rel, ok: false, error: String(error) }
  }
}

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createNodeCanvas(width, height)
    return { canvas, context: canvas.getContext('2d') }
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
  }
}

async function probePdf(rel) {
  const file = path.join(base, rel)
  try {
    const data = await fs.readFile(file)
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1.5 })
    const factory = new NodeCanvasFactory()
    const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await page.render({ canvasContext: context, viewport, canvasFactory: factory }).promise
    return {
      rel,
      ok: true,
      pageCount: pdf.numPages,
      width: canvas.width,
      height: canvas.height,
      pngBytes: canvas.toBuffer('image/png').length,
    }
  } catch (error) {
    return { rel, ok: false, error: String(error) }
  }
}

const result = {
  psd: [
    await probePsd('qa-layered.psd'),
    await probePsd('extra-samples/psd-no-composite-simple.psd'),
    await probePsd('extra-samples/psd-no-composite-blend.psd'),
    await probePsd('extra-samples/4x4_16bit_grayscale.psd'),
  ],
  pdf: [
    await probePdf('qa-single.pdf'),
    await probePdf('qa-multi.pdf'),
  ],
}

console.log(JSON.stringify(result, null, 2))
