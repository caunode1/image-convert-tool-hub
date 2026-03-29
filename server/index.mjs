import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import JSZip from 'jszip'
import convertHeic from 'heic-convert'
import agPsd from 'ag-psd'
import { createCanvas as createNodeCanvas, ImageData } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const { readPsd, initializeCanvas } = agPsd
initializeCanvas(createNodeCanvas, (w, h) => new ImageData(w, h))

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 * 1024 } })

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

const TARGET_MIME = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function normalizeTargetFormat(format = 'png') {
  const key = String(format).toLowerCase()
  if (!TARGET_MIME[key]) throw new Error('지원하지 않는 출력 포맷입니다. jpeg/png/webp 중에서 고르세요.')
  return key === 'jpg' ? 'jpeg' : key
}

function parsePdfPageSelection(mode, input, totalPages) {
  if (mode === 'first') return [1]
  if (mode !== 'range') return Array.from({ length: totalPages }, (_, index) => index + 1)
  const normalized = String(input || '').replace(/\s+/g, '')
  if (!normalized) throw new Error('PDF 페이지 범위를 입력해 주세요. 예: 1-3,5')
  const pages = new Set()
  for (const token of normalized.split(',').filter(Boolean)) {
    const rangeMatch = token.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      if (start < 1 || end < 1 || start > end) throw new Error(`잘못된 PDF 페이지 범위입니다: ${token}`)
      if (end > totalPages) throw new Error(`PDF는 총 ${totalPages}페이지입니다. 범위를 다시 확인해 주세요.`)
      for (let page = start; page <= end; page += 1) pages.add(page)
      continue
    }
    const page = Number(token)
    if (!Number.isInteger(page) || page < 1) throw new Error(`잘못된 PDF 페이지 번호입니다: ${token}`)
    if (page > totalPages) throw new Error(`PDF는 총 ${totalPages}페이지입니다. ${page}페이지는 선택할 수 없습니다.`)
    pages.add(page)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  if (!sorted.length) throw new Error('선택된 PDF 페이지가 없습니다.')
  return sorted
}

function getPdfRenderScale(quality = 'balanced') {
  if (quality === 'fast') return 1.15
  if (quality === 'sharp') return 2
  return 1.5
}

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createNodeCanvas(width, height)
    return { canvas, context: canvas.getContext('2d') }
  }
  reset(target, width, height) {
    target.canvas.width = width
    target.canvas.height = height
  }
  destroy(target) {
    target.canvas.width = 0
    target.canvas.height = 0
  }
}

async function renderPdfPageToPngBuffer(buffer, pageNumber, quality) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: getPdfRenderScale(quality) })
  const factory = new NodeCanvasFactory()
  const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
  await page.render({ canvasContext: context, viewport, canvasFactory: factory }).promise
  return {
    pageCount: pdf.numPages,
    width: canvas.width,
    height: canvas.height,
    buffer: canvas.toBuffer('image/png'),
  }
}

async function convertBufferWithSharp(buffer, targetFormat, quality) {
  const pipeline = sharp(buffer).rotate()
  if (targetFormat === 'jpeg') return pipeline.jpeg({ quality }).toBuffer()
  if (targetFormat === 'webp') return pipeline.webp({ quality }).toBuffer()
  return pipeline.png().toBuffer()
}

async function convertHeicBuffer(buffer, targetFormat, quality) {
  if (targetFormat === 'jpeg') {
    return Buffer.from(await convertHeic({ buffer, format: 'JPEG', quality: Math.max(0.1, Math.min(1, quality / 100)) }))
  }
  const pngBuffer = Buffer.from(await convertHeic({ buffer, format: 'PNG' }))
  if (targetFormat === 'png') return pngBuffer
  return convertBufferWithSharp(pngBuffer, targetFormat, quality)
}

function psdBufferToPng(buffer) {
  const psd = readPsd(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), { useImageData: false })
  if (!psd.canvas) throw new Error('PSD 캔버스를 만들지 못했습니다.')
  return psd.canvas.toBuffer('image/png')
}

function extForTarget(targetFormat) {
  if (targetFormat === 'jpeg') return 'jpg'
  return targetFormat
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, engine: 'prototype-special-format-server' })
})

app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('업로드된 파일이 없습니다.')
    const targetFormat = normalizeTargetFormat(req.body.targetFormat || 'png')
    const quality = Math.max(1, Math.min(100, Number(req.body.quality || 88)))
    const file = req.file
    const mime = file.mimetype
    const originalBase = (file.originalname || 'converted').replace(/\.[^.]+$/, '')

    if (mime === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      const first = await renderPdfPageToPngBuffer(file.buffer, 1, req.body.pdfQuality || 'balanced')
      const pages = parsePdfPageSelection(req.body.pdfPageMode || 'all', req.body.pdfPageRange || '', first.pageCount)
      if (pages.length === 1) {
        const rendered = await renderPdfPageToPngBuffer(file.buffer, pages[0], req.body.pdfQuality || 'balanced')
        const output = await convertBufferWithSharp(rendered.buffer, targetFormat, quality)
        res.setHeader('Content-Type', TARGET_MIME[targetFormat])
        res.setHeader('Content-Disposition', `attachment; filename="${originalBase}-page-${pages[0]}.${extForTarget(targetFormat)}"`)
        return res.send(output)
      }
      const zip = new JSZip()
      for (const pageNumber of pages) {
        const rendered = await renderPdfPageToPngBuffer(file.buffer, pageNumber, req.body.pdfQuality || 'balanced')
        const output = await convertBufferWithSharp(rendered.buffer, targetFormat, quality)
        zip.file(`${originalBase}-page-${pageNumber}.${extForTarget(targetFormat)}`, output)
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${originalBase}-${pages.length}pages.zip"`)
      return res.send(zipBuffer)
    }

    const lowerName = file.originalname.toLowerCase()
    if (mime === 'image/heic' || mime === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
      const output = await convertHeicBuffer(file.buffer, targetFormat, quality)
      res.setHeader('Content-Type', TARGET_MIME[targetFormat])
      res.setHeader('Content-Disposition', `attachment; filename="${originalBase}.${extForTarget(targetFormat)}"`)
      return res.send(output)
    }

    let input = file.buffer
    if (mime === 'image/vnd.adobe.photoshop' || lowerName.endsWith('.psd')) {
      input = psdBufferToPng(file.buffer)
    }

    const output = await convertBufferWithSharp(input, targetFormat, quality)
    res.setHeader('Content-Type', TARGET_MIME[targetFormat])
    res.setHeader('Content-Disposition', `attachment; filename="${originalBase}.${extForTarget(targetFormat)}"`)
    return res.send(output)
  } catch (error) {
    res.status(400).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})

const port = Number(process.env.PORT || 8788)
app.listen(port, () => {
  console.log(`special-format-prototype listening on http://127.0.0.1:${port}`)
})
