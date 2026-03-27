import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'
import { guides, siteInfo, staticPages, type Guide } from './siteContent'

type ToolMode = 'convert' | 'optimize'
type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp'
type GifOutputMode = 'poster' | 'sheet'
type SvgRasterScale = 1 | 2 | 3

const SUPPORTED_INPUT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'application/pdf',
  'image/tiff',
  'image/vnd.adobe.photoshop',
] as const

const FILE_INPUT_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  'application/pdf',
  'image/tiff',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.gif',
  '.svg',
  '.heic',
  '.heif',
  '.pdf',
  '.tif',
  '.tiff',
  '.psd',
].join(',')

const SUPPORTED_INPUT_COPY = 'JPG, PNG, WEBP, BMP, GIF, SVG, HEIC/HEIF, PDF, TIFF, PSD'
const RAW_INPUT_COPY = 'RAW(NEF/CR2/ARW/DNG 등)는 아직 미지원'
const SVG_FALLBACK_SIZE = 1024
const DEFAULT_SVG_RASTER_SCALE: SvgRasterScale = 2
const MAX_VECTOR_RENDER_DIMENSION = 4096
const MAX_GIF_SHEET_FRAMES = 12

const RAW_FILE_EXTENSIONS = new Set([
  '.3fr',
  '.arw',
  '.cr2',
  '.cr3',
  '.dng',
  '.erf',
  '.iiq',
  '.kdc',
  '.mrw',
  '.nef',
  '.nrw',
  '.orf',
  '.pef',
  '.raf',
  '.raw',
  '.rw2',
  '.sr2',
  '.srf',
  '.srw',
  '.x3f',
])

const SVG_LENGTH_UNITS_TO_PX: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  in: 96,
  q: 96 / 101.6,
}

let pdfWorkerConfigured = false
let gifuctModulePromise: Promise<typeof import('gifuct-js')> | null = null
let pdfModulePromise: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | null = null
let pdfWorkerPromise: Promise<{ default: string }> | null = null
let heicModulePromise: Promise<typeof import('heic2any')> | null = null

function loadGifuctModule() {
  if (!gifuctModulePromise) gifuctModulePromise = import('gifuct-js')
  return gifuctModulePromise
}

async function loadPdfModule() {
  if (!pdfModulePromise) pdfModulePromise = import('pdfjs-dist/legacy/build/pdf.mjs')
  if (!pdfWorkerPromise) pdfWorkerPromise = import('pdfjs-dist/legacy/build/pdf.worker.mjs?url')

  const [pdfModule, workerModule] = await Promise.all([pdfModulePromise, pdfWorkerPromise])
  if (!pdfWorkerConfigured) {
    pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default
    pdfWorkerConfigured = true
  }

  return pdfModule
}

async function loadHeicConverter() {
  if (!heicModulePromise) heicModulePromise = import('heic2any')
  const module = await heicModulePromise
  return module.default
}

type SourceItem = {
  id: string
  file: File
  previewUrl: string
  width: number
  height: number
  sizeLabel: string
  mimeType: string
  pageCount?: number
  animated?: boolean
  frameCount?: number
  note?: string
  workingBlob?: Blob
}

type ConvertedItem = {
  id: string
  sourceId: string
  filename: string
  sizeLabel: string
  mimeType: TargetFormat
  width: number
  height: number
  reductionText: string
  url: string
  blob: Blob
}

type FileSpecificOptions = {
  gifOutputMode?: GifOutputMode
  svgRasterScale?: SvgRasterScale
}

type BatchItemState = 'queued' | 'processing' | 'success' | 'error'

type BatchItemStatus = {
  state: BatchItemState
  message: string
  outputCount?: number
  error?: string
}

type BatchProgress = {
  totalFiles: number
  completedFiles: number
  successFiles: number
  failedFiles: number
  currentFileName: string
  currentMessage: string
}

type SvgRasterMeta = {
  width: number
  height: number
  usedViewBox: boolean
  usedFallbackSize: boolean
  hadExplicitSize: boolean
  serialized: string
}

type CompositedGifFrame = {
  index: number
  delay: number
  imageData: ImageData
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function ensureMetaByName(name: string) {
  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = name
    document.head.appendChild(tag)
  }
  return tag
}

function ensureMetaByProperty(name: string) {
  let tag = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement | null
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', name)
    document.head.appendChild(tag)
  }
  return tag
}

function toCanonicalUrl(pathname: string) {
  if (pathname === '/') return siteInfo.siteUrl
  return `${siteInfo.siteUrl}${pathname}/`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function mimeToLabel(mime: TargetFormat | string) {
  if (mime === 'image/jpeg') return 'JPG'
  if (mime === 'image/png') return 'PNG'
  if (mime === 'image/webp') return 'WEBP'
  if (mime === 'image/bmp') return 'BMP'
  if (mime === 'image/gif') return 'GIF'
  if (mime === 'image/svg+xml') return 'SVG'
  if (mime === 'image/heic') return 'HEIC'
  if (mime === 'image/heif') return 'HEIF'
  if (mime === 'application/pdf') return 'PDF'
  if (mime === 'image/tiff') return 'TIFF'
  if (mime === 'image/vnd.adobe.photoshop') return 'PSD'
  return mime.replace('image/', '').toUpperCase()
}

function mimeToExtension(mime: TargetFormat) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  return 'webp'
}

function fileExtension(name: string) {
  const match = name.toLowerCase().match(/\.[^/.]+$/)
  return match?.[0] ?? ''
}

function normalizeIncomingMime(type: string) {
  if (type === 'image/jpg') return 'image/jpeg'
  if (type === 'image/tif') return 'image/tiff'
  if (type === 'application/vnd.adobe.photoshop' || type === 'application/x-photoshop' || type === 'image/x-photoshop') {
    return 'image/vnd.adobe.photoshop'
  }
  return type
}

function isSupportedInputMime(mime: string): mime is (typeof SUPPORTED_INPUT_MIME_TYPES)[number] {
  return SUPPORTED_INPUT_MIME_TYPES.includes(mime as (typeof SUPPORTED_INPUT_MIME_TYPES)[number])
}

function isRawFile(file: File) {
  return RAW_FILE_EXTENSIONS.has(fileExtension(file.name))
}

function mimeFromFile(file: File) {
  const normalizedType = normalizeIncomingMime(file.type)
  if (isSupportedInputMime(normalizedType)) return normalizedType

  const extension = fileExtension(file.name)
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.bmp') return 'image/bmp'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.heic') return 'image/heic'
  if (extension === '.heif') return 'image/heif'
  if (extension === '.pdf') return 'application/pdf'
  if (extension === '.tif' || extension === '.tiff') return 'image/tiff'
  if (extension === '.psd') return 'image/vnd.adobe.photoshop'
  return 'application/octet-stream'
}

function fileNameWithoutExtension(name: string) {
  return name.replace(/\.[^/.]+$/, '')
}

function formatReduction(before: number, after: number) {
  if (!before || before <= 0) return '비교 불가'
  const diff = Math.round(((after - before) / before) * 100)
  if (diff === 0) return '용량 변화 거의 없음'
  return diff < 0 ? `${Math.abs(diff)}% 감소` : `${diff}% 증가`
}

function svgRasterScaleLabel(scale: SvgRasterScale) {
  if (scale === 1) return '빠르게'
  if (scale === 3) return '선명하게'
  return '균형형'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return '변환 중 오류가 발생했습니다.'
}

function createInitialFileOptions(items: SourceItem[]) {
  return items.reduce<Record<string, FileSpecificOptions>>((acc, item) => {
    if (item.mimeType === 'image/svg+xml') acc[item.id] = { svgRasterScale: DEFAULT_SVG_RASTER_SCALE }
    return acc
  }, {})
}

function getCanvasContext(canvas: HTMLCanvasElement, errorMessage: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(errorMessage)
  return ctx
}

function applyHighQualitySmoothing(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

function clampDimension(value: number, fallback = 1) {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.max(1, Math.round(value))
}

function parsePositiveDimensionInput(value: string) {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return clampDimension(parsed)
}

function resolveResizeInputsOnUpload(options: {
  firstSource: SourceItem
  resizeWidth: string
  resizeHeight: string
  keepAspectRatio: boolean
}) {
  const parsedWidth = parsePositiveDimensionInput(options.resizeWidth)
  const parsedHeight = parsePositiveDimensionInput(options.resizeHeight)

  if (parsedWidth && parsedHeight) {
    return {
      width: String(parsedWidth),
      height: String(parsedHeight),
    }
  }

  if (options.keepAspectRatio) {
    if (parsedWidth) {
      return {
        width: String(parsedWidth),
        height: String(Math.max(1, Math.round((parsedWidth / options.firstSource.width) * options.firstSource.height))),
      }
    }

    if (parsedHeight) {
      return {
        width: String(Math.max(1, Math.round((parsedHeight / options.firstSource.height) * options.firstSource.width))),
        height: String(parsedHeight),
      }
    }
  }

  return {
    width: parsedWidth ? String(parsedWidth) : String(options.firstSource.width),
    height: parsedHeight ? String(parsedHeight) : String(options.firstSource.height),
  }
}

function parseSvgLength(value: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.endsWith('%')) return null

  const match = trimmed.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)$/i)
  if (!match) return null

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unit = (match[2] || 'px').toLowerCase()
  const multiplier = SVG_LENGTH_UNITS_TO_PX[unit]
  if (!multiplier) return null
  return amount * multiplier
}

function parseSvgViewBox(value: string | null) {
  if (!value) return null
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((entry) => Number(entry))

  if (parts.length !== 4 || parts.some((entry) => !Number.isFinite(entry))) return null
  const [, , width, height] = parts
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function prepareSvgForRasterization(svgText: string): SvgRasterMeta {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('SVG 구조를 읽지 못했습니다.')
  }

  const svg = doc.documentElement
  if (svg.tagName.toLowerCase() !== 'svg') {
    throw new Error('올바른 SVG 파일이 아닙니다.')
  }

  const explicitWidth = parseSvgLength(svg.getAttribute('width'))
  const explicitHeight = parseSvgLength(svg.getAttribute('height'))
  const viewBox = parseSvgViewBox(svg.getAttribute('viewBox'))

  let width = explicitWidth
  let height = explicitHeight
  let usedViewBox = false
  let usedFallbackSize = false

  if ((!width || !height) && viewBox) {
    if (!width && !height) {
      width = viewBox.width
      height = viewBox.height
    } else if (!width && height) {
      width = height * (viewBox.width / viewBox.height)
    } else if (width && !height) {
      height = width * (viewBox.height / viewBox.width)
    }
    usedViewBox = true
  }

  if (!width || !height) {
    if (width && !height) {
      height = width
    } else if (!width && height) {
      width = height
    } else {
      width = SVG_FALLBACK_SIZE
      height = SVG_FALLBACK_SIZE
    }
    usedFallbackSize = true
  }

  const normalizedWidth = clampDimension(width)
  const normalizedHeight = clampDimension(height)

  svg.setAttribute('xmlns', svg.getAttribute('xmlns') || 'http://www.w3.org/2000/svg')
  if (!svg.getAttribute('xmlns:xlink')) {
    svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  }
  if (!svg.getAttribute('viewBox')) {
    svg.setAttribute('viewBox', `0 0 ${normalizedWidth} ${normalizedHeight}`)
  }
  if (!svg.getAttribute('preserveAspectRatio')) {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  }

  svg.setAttribute('width', String(normalizedWidth))
  svg.setAttribute('height', String(normalizedHeight))

  const serialized = new XMLSerializer().serializeToString(svg)

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    usedViewBox,
    usedFallbackSize,
    hadExplicitSize: Boolean(explicitWidth && explicitHeight),
    serialized,
  }
}

function buildSvgNote(meta: SvgRasterMeta) {
  if (meta.usedFallbackSize) {
    return `SVG 크기 정보가 부족해 ${meta.width}×${meta.height}px 기준으로 래스터라이즈합니다. 결과가 다르면 원본 SVG에 width/height 또는 viewBox를 넣어 주세요.`
  }
  if (meta.usedViewBox && !meta.hadExplicitSize) {
    return `SVG는 viewBox를 기준으로 ${meta.width}×${meta.height}px 크기를 잡아 변환합니다.`
  }
  return `SVG는 ${meta.width}×${meta.height}px 기준으로 선명하게 래스터라이즈합니다.`
}

async function loadImageFromBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
      el.decoding = 'async'
      el.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function canvasToPngBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('이미지 미리보기를 만들지 못했습니다.')
  return blob
}

async function rgbaToPngBlob(rgba: Uint8Array, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = getCanvasContext(canvas, '브라우저에서 TIFF 처리를 지원하지 않습니다.')

  const data = new Uint8ClampedArray(rgba.byteLength)
  data.set(rgba)
  ctx.putImageData(new ImageData(data, width, height), 0, 0)
  return canvasToPngBlob(canvas)
}

async function renderPdfPageToPngBlob(file: File, pageNumber = 1) {
  const { getDocument } = await loadPdfModule()
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = getCanvasContext(canvas, 'PDF 렌더링을 지원하지 않습니다.')
  await page.render({ canvas: null, canvasContext: ctx, viewport }).promise
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('PDF 미리보기를 만들지 못했습니다.')
  return { blob, pageCount: pdf.numPages, width: canvas.width, height: canvas.height }
}

async function renderTiffToPngBlob(file: File) {
  const { default: UTIF } = await import('utif')
  const buffer = await file.arrayBuffer()
  const ifds = UTIF.decode(buffer) as Array<Record<string, unknown>>
  const candidates = ifds
    .map((ifd) => {
      const width = Number(ifd.width ?? (Array.isArray(ifd.t256) ? ifd.t256[0] : ifd.t256) ?? 0)
      const height = Number(ifd.height ?? (Array.isArray(ifd.t257) ? ifd.t257[0] : ifd.t257) ?? 0)
      return { ifd, width, height, area: width * height }
    })
    .filter((item) => item.width > 0 && item.height > 0)
    .sort((a, b) => b.area - a.area)

  const target = candidates[0]
  if (!target) throw new Error('TIFF 이미지를 읽지 못했습니다.')

  UTIF.decodeImage(buffer, target.ifd)
  const rgba = UTIF.toRGBA8(target.ifd) as Uint8Array
  const blob = await rgbaToPngBlob(rgba, target.width, target.height)

  return {
    blob,
    width: target.width,
    height: target.height,
    pageCount: candidates.length,
  }
}

async function renderPsdToPngBlob(file: File) {
  const { readPsd } = await import('ag-psd')
  const psd = readPsd(await file.arrayBuffer(), { skipLayerImageData: true, skipThumbnail: true })

  if (psd.bitsPerChannel && psd.bitsPerChannel !== 8) {
    throw new Error('16비트 이상 PSD는 아직 지원하지 않습니다.')
  }

  const canvas = psd.canvas as HTMLCanvasElement | undefined
  if (!canvas) throw new Error('PSD 합성 미리보기가 없는 파일입니다.')

  return {
    blob: await canvasToPngBlob(canvas),
    width: psd.width ?? canvas.width,
    height: psd.height ?? canvas.height,
  }
}

function normalizeGifDelay(delay: number) {
  return delay > 0 ? delay : 100
}

async function readGifFrames(file: File) {
  const { parseGIF, decompressFrames } = await loadGifuctModule()
  const parsed = parseGIF(await file.arrayBuffer())
  const frames = decompressFrames(parsed, true)
  return {
    width: parsed.lsd.width,
    height: parsed.lsd.height,
    frames,
  }
}

function sampleGifFrames(frames: CompositedGifFrame[], limit = MAX_GIF_SHEET_FRAMES) {
  if (frames.length <= limit) return frames

  const sampled: CompositedGifFrame[] = []
  const usedIndexes = new Set<number>()
  const step = (frames.length - 1) / (limit - 1)

  for (let i = 0; i < limit; i += 1) {
    const index = Math.round(i * step)
    if (!usedIndexes.has(index)) {
      sampled.push(frames[index])
      usedIndexes.add(index)
    }
  }

  return sampled.sort((a, b) => a.index - b.index)
}

function selectRepresentativeGifFrame(frames: CompositedGifFrame[]) {
  if (frames.length <= 1) return frames[0]

  const totalDuration = frames.reduce((sum, frame) => sum + normalizeGifDelay(frame.delay), 0)
  const midpoint = totalDuration / 2
  let cursor = 0

  for (const frame of frames) {
    cursor += normalizeGifDelay(frame.delay)
    if (cursor >= midpoint) return frame
  }

  return frames[frames.length - 1]
}

async function composeGifFrames(file: File) {
  const gif = await readGifFrames(file)
  const canvas = document.createElement('canvas')
  canvas.width = gif.width
  canvas.height = gif.height
  const ctx = getCanvasContext(canvas, 'GIF 프레임을 합성하지 못했습니다.')

  const patchCanvas = document.createElement('canvas')
  const patchCtx = getCanvasContext(patchCanvas, 'GIF 프레임을 그리지 못했습니다.')
  const composedFrames: CompositedGifFrame[] = []

  for (let index = 0; index < gif.frames.length; index += 1) {
    const frame = gif.frames[index]
    const snapshotBeforeDraw = frame.disposalType === 3 ? ctx.getImageData(0, 0, gif.width, gif.height) : null

    patchCanvas.width = frame.dims.width
    patchCanvas.height = frame.dims.height
    const patchImageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height)
    patchCtx.putImageData(patchImageData, 0, 0)
    ctx.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

    composedFrames.push({
      index,
      delay: normalizeGifDelay(frame.delay),
      imageData: ctx.getImageData(0, 0, gif.width, gif.height),
    })

    if (frame.disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height)
    } else if (frame.disposalType === 3 && snapshotBeforeDraw) {
      ctx.putImageData(snapshotBeforeDraw, 0, 0)
    }
  }

  return {
    width: gif.width,
    height: gif.height,
    frames: composedFrames,
  }
}

async function renderGifRepresentativeFrame(file: File, outputWidth?: number, outputHeight?: number) {
  const { width, height, frames } = await composeGifFrames(file)
  if (!frames.length) throw new Error('GIF 프레임을 읽지 못했습니다.')

  const frame = selectRepresentativeGifFrame(frames)
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth ?? width
  canvas.height = outputHeight ?? height
  const ctx = getCanvasContext(canvas, 'GIF 대표 프레임을 만들지 못했습니다.')
  applyHighQualitySmoothing(ctx)

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = width
  frameCanvas.height = height
  const frameCtx = getCanvasContext(frameCanvas, 'GIF 프레임 캔버스를 만들지 못했습니다.')
  frameCtx.putImageData(frame.imageData, 0, 0)
  ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height)

  return { blob: await canvasToPngBlob(canvas), width: canvas.width, height: canvas.height }
}

async function renderGifFrameSheet(file: File, outputWidth?: number, outputHeight?: number) {
  const { width, height, frames } = await composeGifFrames(file)
  if (!frames.length) throw new Error('GIF 프레임을 읽지 못했습니다.')

  const sampledFrames = sampleGifFrames(frames)
  const columns = Math.min(4, sampledFrames.length)
  const rows = Math.ceil(sampledFrames.length / columns)
  const padding = 16
  const labelHeight = 28
  const tileWidth = outputWidth ?? width
  const tileHeight = outputHeight ?? height

  const canvas = document.createElement('canvas')
  canvas.width = columns * tileWidth + padding * (columns + 1)
  canvas.height = rows * (tileHeight + labelHeight) + padding * (rows + 1)
  const ctx = getCanvasContext(canvas, 'GIF 프레임 시트를 만들지 못했습니다.')
  applyHighQualitySmoothing(ctx)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.textBaseline = 'middle'
  ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = width
  frameCanvas.height = height
  const frameCtx = getCanvasContext(frameCanvas, 'GIF 프레임 캔버스를 만들지 못했습니다.')

  sampledFrames.forEach((frame, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = padding + column * (tileWidth + padding)
    const y = padding + row * (tileHeight + labelHeight + padding)

    ctx.save()
    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)'
    ctx.fillRect(x, y, tileWidth, tileHeight)
    ctx.restore()

    frameCtx.putImageData(frame.imageData, 0, 0)
    ctx.drawImage(frameCanvas, x, y, tileWidth, tileHeight)

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
    ctx.fillText(`프레임 ${frame.index + 1} · ${frame.delay}ms`, x + 2, y + tileHeight + labelHeight / 2)
  })

  return { blob: await canvasToPngBlob(canvas), width: canvas.width, height: canvas.height }
}

async function prepareSourceItem(file: File): Promise<SourceItem> {
  const mimeType = mimeFromFile(file)
  const id = `${file.name}-${file.lastModified}-${file.size}`

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const heic2any = await loadHeicConverter()
    const converted = await heic2any({ blob: file, toType: 'image/png' })
    const blob = Array.isArray(converted) ? converted[0] : converted
    if (!(blob instanceof Blob)) {
      throw new Error('HEIC/HEIF 파일을 브라우저용 이미지로 바꾸지 못했습니다.')
    }
    const previewUrl = URL.createObjectURL(blob)
    const image = await loadImageFromBlob(blob)
    return {
      id,
      file,
      previewUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
      sizeLabel: formatBytes(file.size),
      mimeType,
      workingBlob: blob,
      note: 'HEIC/HEIF는 먼저 PNG로 바꿔 처리합니다. 대부분 단일 이미지형은 괜찮지만 일부 HEIF 변형은 실패할 수 있습니다.',
    }
  }

  if (mimeType === 'application/pdf') {
    const rendered = await renderPdfPageToPngBlob(file, 1)
    const previewUrl = URL.createObjectURL(rendered.blob)
    return {
      id,
      file,
      previewUrl,
      width: rendered.width,
      height: rendered.height,
      sizeLabel: formatBytes(file.size),
      mimeType,
      pageCount: rendered.pageCount,
      note: rendered.pageCount > 1 ? `PDF ${rendered.pageCount}페이지를 이미지로 순서대로 변환합니다.` : 'PDF 1페이지를 이미지로 변환합니다.',
    }
  }

  if (mimeType === 'image/tiff') {
    const rendered = await renderTiffToPngBlob(file)
    const previewUrl = URL.createObjectURL(rendered.blob)
    return {
      id,
      file,
      previewUrl,
      width: rendered.width,
      height: rendered.height,
      sizeLabel: formatBytes(file.size),
      mimeType,
      pageCount: rendered.pageCount,
      workingBlob: rendered.blob,
      note: rendered.pageCount > 1 ? 'TIFF는 가장 큰 페이지 1장 기준으로 변환합니다.' : 'TIFF 파일을 브라우저용 이미지로 읽어 변환합니다.',
    }
  }

  if (mimeType === 'image/vnd.adobe.photoshop') {
    const rendered = await renderPsdToPngBlob(file)
    const previewUrl = URL.createObjectURL(rendered.blob)
    return {
      id,
      file,
      previewUrl,
      width: rendered.width,
      height: rendered.height,
      sizeLabel: formatBytes(file.size),
      mimeType,
      workingBlob: rendered.blob,
      note: 'PSD는 합성 미리보기 기준으로 변환합니다. 8bit 합성 프리뷰가 없거나 16bit 이상이면 제한될 수 있습니다.',
    }
  }

  if (mimeType === 'image/gif') {
    const gif = await readGifFrames(file)
    const previewUrl = URL.createObjectURL(file)
    return {
      id,
      file,
      previewUrl,
      width: gif.width,
      height: gif.height,
      sizeLabel: formatBytes(file.size),
      mimeType,
      animated: gif.frames.length > 1,
      frameCount: gif.frames.length,
      note: gif.frames.length > 1 ? `애니메이션 GIF ${gif.frames.length}프레임을 감지했습니다. 대표 프레임 또는 프레임 시트로 변환할 수 있습니다.` : '정적 GIF 파일입니다.',
    }
  }

  if (mimeType === 'image/svg+xml') {
    const svgMeta = prepareSvgForRasterization(await file.text())
    const svgBlob = new Blob([svgMeta.serialized], { type: 'image/svg+xml;charset=utf-8' })
    const previewUrl = URL.createObjectURL(svgBlob)
    return {
      id,
      file,
      previewUrl,
      width: svgMeta.width,
      height: svgMeta.height,
      sizeLabel: formatBytes(file.size),
      mimeType,
      workingBlob: svgBlob,
      note: buildSvgNote(svgMeta),
    }
  }

  const previewUrl = URL.createObjectURL(file)
  const image = await loadImageFromBlob(file)
  return {
    id,
    file,
    previewUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    sizeLabel: formatBytes(file.size),
    mimeType,
  }
}

async function convertGifToWorkingBlob(options: {
  source: SourceItem
  resizeWidth?: number
  resizeHeight?: number
  gifOutputMode: GifOutputMode
}) {
  if (options.gifOutputMode === 'sheet') {
    return renderGifFrameSheet(options.source.file, options.resizeWidth, options.resizeHeight)
  }
  return renderGifRepresentativeFrame(options.source.file, options.resizeWidth, options.resizeHeight)
}

async function convertFile(options: {
  source: SourceItem
  targetFormat: TargetFormat
  quality: number
  resizeWidth?: number
  resizeHeight?: number
  pdfPageNumber?: number
  gifOutputMode: GifOutputMode
  svgRasterScale?: SvgRasterScale
}) {
  if (options.source.mimeType === 'image/gif' && options.source.animated) {
    const gifRendered = await convertGifToWorkingBlob({
      source: options.source,
      resizeWidth: options.resizeWidth,
      resizeHeight: options.resizeHeight,
      gifOutputMode: options.gifOutputMode,
    })

    if (options.targetFormat === 'image/png') {
      return gifRendered
    }

    const image = await loadImageFromBlob(gifRendered.blob)
    const canvas = document.createElement('canvas')
    canvas.width = gifRendered.width
    canvas.height = gifRendered.height
    const ctx = getCanvasContext(canvas, '브라우저에서 이미지 변환을 지원하지 않습니다.')
    applyHighQualitySmoothing(ctx)

    if (options.targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, options.targetFormat, options.quality)
    })

    if (!blob) throw new Error('변환 결과를 만들지 못했습니다.')
    return { blob, width: canvas.width, height: canvas.height }
  }

  let inputBlob: Blob = options.source.workingBlob ?? options.source.file
  if (options.source.mimeType === 'application/pdf') {
    const rendered = await renderPdfPageToPngBlob(options.source.file, options.pdfPageNumber ?? 1)
    inputBlob = rendered.blob
  }

  const image = await loadImageFromBlob(inputBlob)
  const width = options.resizeWidth || image.naturalWidth
  const height = options.resizeHeight || image.naturalHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = getCanvasContext(canvas, '브라우저에서 이미지 변환을 지원하지 않습니다.')
  applyHighQualitySmoothing(ctx)

  if (options.targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  if (options.source.mimeType === 'image/svg+xml') {
    const svgRasterScale = options.svgRasterScale ?? DEFAULT_SVG_RASTER_SCALE
    const renderWidth = Math.min(MAX_VECTOR_RENDER_DIMENSION, clampDimension(width * svgRasterScale))
    const renderHeight = Math.min(MAX_VECTOR_RENDER_DIMENSION, clampDimension(height * svgRasterScale))

    if (renderWidth > width || renderHeight > height) {
      const rasterCanvas = document.createElement('canvas')
      rasterCanvas.width = renderWidth
      rasterCanvas.height = renderHeight
      const rasterCtx = getCanvasContext(rasterCanvas, 'SVG 래스터라이즈 캔버스를 만들지 못했습니다.')
      applyHighQualitySmoothing(rasterCtx)
      rasterCtx.drawImage(image, 0, 0, renderWidth, renderHeight)
      ctx.drawImage(rasterCanvas, 0, 0, width, height)
    } else {
      ctx.drawImage(image, 0, 0, width, height)
    }
  } else {
    ctx.drawImage(image, 0, 0, width, height)
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, options.targetFormat, options.quality)
  })

  if (!blob) throw new Error('변환 결과를 만들지 못했습니다.')
  return { blob, width, height }
}

function GuideList({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="page-stack">
      <div className="section-heading left-align narrow">
        <p className="eyebrow">Guides</p>
        <h1>이미지 변환 전에 읽어두면 좋은 가이드</h1>
        <p>포맷 차이, 화질 저하, 용량 줄이기 같은 내용을 실제 사용 기준으로 정리했습니다.</p>
      </div>
      <div className="card-grid three-up">
        {guides.map((guide) => (
          <article key={guide.slug} className="surface-card guide-card">
            <p className="card-kicker">{guide.category}</p>
            <h3>{guide.title}</h3>
            <p>{guide.summary}</p>
            <div className="meta-row">
              <span>{guide.updated}</span>
              <span>{guide.readingTime}</span>
            </div>
            <button type="button" className="text-link-button" onClick={() => onNavigate(`/guides/${guide.slug}`)}>
              읽어보기
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function GuideDetail({ guide }: { guide: Guide }) {
  return (
    <article className="page-stack">
      <header className="surface-card detail-header">
        <p className="eyebrow">{guide.category}</p>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
        <div className="meta-row left-align">
          <span>업데이트 {guide.updated}</span>
          <span>{guide.readingTime}</span>
        </div>
      </header>
      {guide.sections.map((section) => (
        <section key={section.heading} className="surface-card detail-section">
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets ? (
            <ul className="bullet-list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  )
}

function StaticPage({ pageKey }: { pageKey: string }) {
  const page = staticPages[pageKey as keyof typeof staticPages]
  if (!page) return null

  return (
    <article className="page-stack">
      <header className="surface-card detail-header">
        <p className="eyebrow">Info</p>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
      </header>
      {page.sections.map((section) => (
        <section key={section.heading} className="surface-card detail-section">
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets ? (
            <ul className="bullet-list">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  )
}

function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))
  const [mode, setMode] = useState<ToolMode>('convert')
  const [sourceItems, setSourceItems] = useState<SourceItem[]>([])
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('image/jpeg')
  const [quality, setQuality] = useState(0.9)
  const [resizeEnabled, setResizeEnabled] = useState(false)
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')
  const [gifOutputMode, setGifOutputMode] = useState<GifOutputMode>('poster')
  const [fileOptions, setFileOptions] = useState<Record<string, FileSpecificOptions>>({})
  const [results, setResults] = useState<ConvertedItem[]>([])
  const [batchStatuses, setBatchStatuses] = useState<Record<string, BatchItemStatus>>({})
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const currentGuide = useMemo(() => guides.find((guide) => `/guides/${guide.slug}` === path) ?? null, [path])
  const staticKey = useMemo(() => path.replace('/', ''), [path])
  const firstSource = sourceItems[0] ?? null
  const firstResult = results[0] ?? null
  const originalMime = firstSource?.mimeType ?? ''
  const targetLabel = mimeToLabel(targetFormat)
  const originalLabel = originalMime ? mimeToLabel(originalMime) : '알 수 없음'
  const hasAnimatedGif = sourceItems.some((item) => item.animated)
  const hasSvgInput = sourceItems.some((item) => item.mimeType === 'image/svg+xml')
  const isTransparentToJpg = targetFormat === 'image/jpeg' && (originalMime === 'image/png' || originalMime === 'image/webp' || originalMime === 'image/gif' || originalMime === 'image/svg+xml' || originalMime === 'image/tiff' || originalMime === 'image/vnd.adobe.photoshop')
  const qualityDisabled = targetFormat === 'image/png'
  const qualityHelper = qualityDisabled
    ? 'PNG는 품질 슬라이더 영향이 작고, 주로 크기 조절이 용량에 더 크게 작용합니다.'
    : mode === 'optimize'
      ? '용량을 많이 줄이고 싶다면 70~85%부터 비교해 보시는 것을 권장합니다.'
      : '일반 사진은 85~92% 정도면 품질과 용량 균형이 좋은 편입니다. HEIC, PDF, TIFF, PSD는 내부적으로 브라우저용 이미지로 바꾼 뒤 출력합니다.'
  const batchProgressPercent = batchProgress ? Math.round((batchProgress.completedFiles / Math.max(1, batchProgress.totalFiles)) * 100) : 0
  const hasFiles = sourceItems.length > 0
  const hasResults = results.length > 0
  const currentFlowStep = hasResults ? 4 : hasFiles ? (isProcessing ? 3 : 2) : 1
  const flowSummaryTitle = hasResults
    ? '4. 결과 다운로드'
    : hasFiles
      ? isProcessing
        ? '3. 변환 진행 중'
        : '2. 설정 확인'
      : '1. 파일 업로드'
  const flowSummaryText = hasResults
    ? '결과 목록과 ZIP 다운로드 버튼이 준비됐습니다.'
    : hasFiles
      ? isProcessing
        ? '파일별 상태를 순서대로 처리하고 있습니다.'
        : '출력 형식과 품질을 확인한 뒤 변환 버튼을 누르세요.'
      : '왼쪽 업로드 박스를 눌러 여러 파일을 먼저 선택하세요.'

  const getGifOutputModeForItem = (item: SourceItem) => fileOptions[item.id]?.gifOutputMode ?? gifOutputMode
  const getSvgRasterScaleForItem = (item: SourceItem): SvgRasterScale => fileOptions[item.id]?.svgRasterScale ?? DEFAULT_SVG_RASTER_SCALE

  const animatedGifItems = useMemo(() => sourceItems.filter((item) => item.animated), [sourceItems])
  const effectiveGifSummary = useMemo(() => {
    const total = animatedGifItems.length
    const posterCount = animatedGifItems.filter((item) => (fileOptions[item.id]?.gifOutputMode ?? gifOutputMode) === 'poster').length
    const sheetCount = total - posterCount
    const hasMixed = posterCount > 0 && sheetCount > 0
    const allSheet = total > 0 && sheetCount === total

    return {
      total,
      posterCount,
      sheetCount,
      hasMixed,
      label: hasMixed ? `대표 프레임 ${posterCount}개 · 프레임 시트 ${sheetCount}개` : allSheet ? '프레임 시트 1장' : '대표 프레임 1장',
      helperText: hasMixed
        ? `현재 파일별 설정이 섞여 있어 실제 결과는 파일별 선택을 따릅니다. (대표 ${posterCount}개 / 시트 ${sheetCount}개)`
        : allSheet
          ? `현재 GIF는 모두 최대 ${MAX_GIF_SHEET_FRAMES}프레임 시트로 처리합니다. 파일별로 대표 프레임으로 바꿀 수 있습니다.`
          : '현재 GIF는 모두 대표 프레임 1장으로 처리합니다. 파일별로 프레임 시트로 바꿀 수 있습니다.',
      noticeText: hasMixed
        ? `애니메이션 GIF는 파일별 설정대로 처리합니다. 현재 대표 프레임 ${posterCount}개, 프레임 시트 ${sheetCount}개로 나뉘어 있습니다.`
        : allSheet
          ? `애니메이션 GIF는 전체 재생 파일로 바꾸지 않고, 최대 ${MAX_GIF_SHEET_FRAMES}프레임을 한 장의 시트로 정리합니다.`
          : '애니메이션 GIF는 단순 첫 프레임이 아니라, 합성된 대표 프레임 1장을 골라 변환합니다.',
    }
  }, [animatedGifItems, fileOptions, gifOutputMode])

  const seoMeta = useMemo(() => {
    if (currentGuide) return { title: `${currentGuide.title} | ${siteInfo.name}`, description: currentGuide.description }
    if (path === '/guides') return { title: `가이드 모음 | ${siteInfo.name}`, description: '이미지 변환, 압축, 리사이즈와 관련된 실용 가이드를 모아 둔 페이지입니다.' }
    if (path === '/about') return { title: `소개 | ${siteInfo.name}`, description: staticPages.about.description }
    if (path === '/methodology') return { title: `방법론 | ${siteInfo.name}`, description: staticPages.methodology.description }
    if (path === '/privacy') return { title: `개인정보처리방침 | ${siteInfo.name}`, description: staticPages.privacy.description }
    if (path === '/terms') return { title: `이용안내 | ${siteInfo.name}`, description: staticPages.terms.description }
    if (path === '/contact') return { title: `문의 | ${siteInfo.name}`, description: staticPages.contact.description }
    if (path === '/faq') return { title: `자주 묻는 질문 | ${siteInfo.name}`, description: staticPages.faq.description }
    return { title: `${siteInfo.name} | 여러 이미지 파일을 한 번에 변환하는 도구`, description: siteInfo.description }
  }, [currentGuide, path])

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    document.title = seoMeta.title
    ensureMetaByName('description').setAttribute('content', seoMeta.description)
    ensureMetaByName('author').setAttribute('content', siteInfo.name)
    ensureMetaByName('robots').setAttribute('content', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
    ensureMetaByProperty('og:title').setAttribute('content', seoMeta.title)
    ensureMetaByProperty('og:description').setAttribute('content', seoMeta.description)
    ensureMetaByProperty('og:type').setAttribute('content', 'website')
    ensureMetaByProperty('og:site_name').setAttribute('content', siteInfo.name)
    ensureMetaByProperty('og:locale').setAttribute('content', 'ko_KR')
    ensureMetaByProperty('og:url').setAttribute('content', toCanonicalUrl(path))
    ensureMetaByName('twitter:card').setAttribute('content', 'summary_large_image')

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = toCanonicalUrl(path)
  }, [path, seoMeta])

  useEffect(() => {
    return () => {
      sourceItems.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      results.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [results, sourceItems])

  const navigate = (nextPath: string) => {
    const normalized = normalizePath(nextPath)
    if (normalized === path) return
    window.history.pushState({}, '', normalized)
    setPath(normalized)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const clearAllFiles = () => {
    sourceItems.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    results.forEach((item) => URL.revokeObjectURL(item.url))
    setSourceItems([])
    setFileOptions({})
    setResults([])
    setBatchStatuses({})
    setBatchProgress(null)
    setResizeWidth('')
    setResizeHeight('')
    setGifOutputMode('poster')
  }

  const updateGifFileOption = (sourceId: string, nextMode: GifOutputMode) => {
    setFileOptions((current) => ({
      ...current,
      [sourceId]: {
        ...current[sourceId],
        gifOutputMode: nextMode,
      },
    }))
  }

  const updateSvgFileOption = (sourceId: string, nextScale: SvgRasterScale) => {
    setFileOptions((current) => ({
      ...current,
      [sourceId]: {
        ...current[sourceId],
        svgRasterScale: nextScale,
      },
    }))
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (!selected.length) return

    const previousResizeWidth = resizeWidth
    const previousResizeHeight = resizeHeight
    const shouldKeepAspectRatio = keepAspectRatio

    clearAllFiles()
    setError('')
    setNotice('')

    const supported: SourceItem[] = []
    const unsupportedNames: string[] = []
    const rawNames: string[] = []
    const unreadableNames: string[] = []

    for (const file of selected) {
      const mimeType = mimeFromFile(file)
      if (!isSupportedInputMime(mimeType)) {
        if (isRawFile(file)) rawNames.push(file.name)
        else unsupportedNames.push(file.name)
        continue
      }

      try {
        supported.push(await prepareSourceItem(file))
      } catch {
        unreadableNames.push(file.name)
      }
    }

    if (supported.length) {
      const initialResize = resolveResizeInputsOnUpload({
        firstSource: supported[0],
        resizeWidth: previousResizeWidth,
        resizeHeight: previousResizeHeight,
        keepAspectRatio: shouldKeepAspectRatio,
      })

      setSourceItems(supported)
      setFileOptions(createInitialFileOptions(supported))
      setBatchStatuses({})
      setBatchProgress(null)
      setResizeWidth(initialResize.width)
      setResizeHeight(initialResize.height)

      const animatedGifCount = supported.filter((item) => item.animated).length
      const svgCount = supported.filter((item) => item.mimeType === 'image/svg+xml').length
      const excludedMessages = [
        rawNames.length ? `RAW ${rawNames.length}개는 아직 지원하지 않아 제외했습니다.` : '',
        unsupportedNames.length ? `미지원 파일 ${unsupportedNames.length}개는 제외했습니다.` : '',
        unreadableNames.length ? `읽지 못한 파일 ${unreadableNames.length}개는 제외했습니다.` : '',
        animatedGifCount ? `애니메이션 GIF ${animatedGifCount}개는 파일별로 대표 프레임/시트 선택이 가능합니다.` : '',
        svgCount ? `SVG ${svgCount}개는 파일별 선명도 옵션을 함께 조절할 수 있습니다.` : '',
      ].filter(Boolean)

      setNotice(`${supported.length}개 파일을 불러왔습니다.${excludedMessages.length ? ` ${excludedMessages.join(' ')}` : ''}`)
    } else if (rawNames.length && !unsupportedNames.length && !unreadableNames.length) {
      setError('RAW 파일은 아직 지원하지 않습니다. 브라우저 버전에서는 TIFF·PSD까지 우선 지원하고, NEF/CR2/ARW/DNG 등은 다음 단계 검토 대상입니다.')
    } else {
      setError(`현재는 ${SUPPORTED_INPUT_COPY} 파일을 지원합니다.`)
    }

    if (event.target) event.target.value = ''
  }

  const applyPreset = (next: { mode: ToolMode; format: TargetFormat; quality: number; resizeEnabled?: boolean }) => {
    setMode(next.mode)
    setTargetFormat(next.format)
    setQuality(next.quality)
    setResizeEnabled(Boolean(next.resizeEnabled))
    setNotice(`${mimeToLabel(next.format)} 기준 프리셋을 적용했습니다.`)
  }

  const updateResizeWidth = (value: string) => {
    setResizeWidth(value)
    if (!keepAspectRatio || !firstSource) return
    const width = Number(value)
    if (!Number.isFinite(width) || width <= 0) return
    const nextHeight = Math.max(1, Math.round((width / firstSource.width) * firstSource.height))
    setResizeHeight(String(nextHeight))
  }

  const updateResizeHeight = (value: string) => {
    setResizeHeight(value)
    if (!keepAspectRatio || !firstSource) return
    const height = Number(value)
    if (!Number.isFinite(height) || height <= 0) return
    const nextWidth = Math.max(1, Math.round((height / firstSource.height) * firstSource.width))
    setResizeWidth(String(nextWidth))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sourceItems.length) {
      setError('먼저 이미지 파일을 올려 주세요.')
      return
    }

    const parsedWidth = resizeEnabled && resizeWidth ? Number(resizeWidth) : undefined
    const parsedHeight = resizeEnabled && resizeHeight ? Number(resizeHeight) : undefined
    if (resizeEnabled && ((parsedWidth && parsedWidth <= 0) || (parsedHeight && parsedHeight <= 0))) {
      setError('리사이즈 값은 1px 이상이어야 합니다.')
      return
    }

    setIsProcessing(true)
    setError('')
    setNotice('파일별 상태를 업데이트하며 변환하고 있습니다...')
    results.forEach((item) => URL.revokeObjectURL(item.url))
    setResults([])

    const initialStatuses = sourceItems.reduce<Record<string, BatchItemStatus>>((acc, item) => {
      acc[item.id] = { state: 'queued', message: '대기 중' }
      return acc
    }, {})

    setBatchStatuses(initialStatuses)
    setBatchProgress({
      totalFiles: sourceItems.length,
      completedFiles: 0,
      successFiles: 0,
      failedFiles: 0,
      currentFileName: sourceItems[0]?.file.name ?? '',
      currentMessage: '대기 중',
    })

    const nextResults: ConvertedItem[] = []
    const failed: Array<{ name: string; reason: string }> = []
    let completedFiles = 0
    let successFiles = 0
    let failedFiles = 0

    const updateProgress = (next: { currentFileName: string; currentMessage: string }) => {
      setBatchProgress({
        totalFiles: sourceItems.length,
        completedFiles,
        successFiles,
        failedFiles,
        currentFileName: next.currentFileName,
        currentMessage: next.currentMessage,
      })
    }

    for (const item of sourceItems) {
      const gifOutputModeForItem = getGifOutputModeForItem(item)
      const svgRasterScaleForItem = getSvgRasterScaleForItem(item)
      const isPdf = item.mimeType === 'application/pdf'
      const totalPages = isPdf ? (item.pageCount ?? 1) : 1

      setBatchStatuses((current) => ({
        ...current,
        [item.id]: {
          state: 'processing',
          message: isPdf && totalPages > 1 ? `1 / ${totalPages}페이지 처리 중` : '변환 중',
        },
      }))
      updateProgress({
        currentFileName: item.file.name,
        currentMessage: isPdf && totalPages > 1 ? `1 / ${totalPages}페이지 처리 중` : '변환 중',
      })

      try {
        if (isPdf) {
          for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            const pageMessage = `${pageNumber} / ${totalPages}페이지 처리 중`
            setBatchStatuses((current) => ({
              ...current,
              [item.id]: {
                state: 'processing',
                message: pageMessage,
              },
            }))
            updateProgress({ currentFileName: item.file.name, currentMessage: pageMessage })

            const converted = await convertFile({
              source: item,
              targetFormat,
              quality,
              resizeWidth: parsedWidth,
              resizeHeight: parsedHeight,
              pdfPageNumber: pageNumber,
              gifOutputMode: gifOutputModeForItem,
              svgRasterScale: svgRasterScaleForItem,
            })
            const url = URL.createObjectURL(converted.blob)
            nextResults.push({
              id: `${item.id}-${targetFormat}-p${pageNumber}`,
              sourceId: item.id,
              filename: `${fileNameWithoutExtension(item.file.name)}-page-${pageNumber}.${mimeToExtension(targetFormat)}`,
              sizeLabel: formatBytes(converted.blob.size),
              mimeType: targetFormat,
              width: converted.width,
              height: converted.height,
              reductionText: formatReduction(item.file.size, converted.blob.size),
              url,
              blob: converted.blob,
            })
          }
        } else {
          const converted = await convertFile({
            source: item,
            targetFormat,
            quality,
            resizeWidth: parsedWidth,
            resizeHeight: parsedHeight,
            gifOutputMode: gifOutputModeForItem,
            svgRasterScale: svgRasterScaleForItem,
          })
          const url = URL.createObjectURL(converted.blob)
          const gifSuffix = item.mimeType === 'image/gif' && item.animated ? (gifOutputModeForItem === 'sheet' ? '-framesheet' : '-poster') : '-converted'
          nextResults.push({
            id: `${item.id}-${targetFormat}`,
            sourceId: item.id,
            filename: `${fileNameWithoutExtension(item.file.name)}${gifSuffix}.${mimeToExtension(targetFormat)}`,
            sizeLabel: formatBytes(converted.blob.size),
            mimeType: targetFormat,
            width: converted.width,
            height: converted.height,
            reductionText: formatReduction(item.file.size, converted.blob.size),
            url,
            blob: converted.blob,
          })
        }

        completedFiles += 1
        successFiles += 1
        setBatchStatuses((current) => ({
          ...current,
          [item.id]: {
            state: 'success',
            message: totalPages > 1 ? `${totalPages}페이지 변환 완료` : '변환 완료',
            outputCount: totalPages,
          },
        }))
        updateProgress({
          currentFileName: item.file.name,
          currentMessage: totalPages > 1 ? `${totalPages}페이지 변환 완료` : '변환 완료',
        })
      } catch (conversionError) {
        completedFiles += 1
        failedFiles += 1
        const reason = getErrorMessage(conversionError)
        failed.push({ name: item.file.name, reason })
        setBatchStatuses((current) => ({
          ...current,
          [item.id]: {
            state: 'error',
            message: '변환 실패',
            error: reason,
          },
        }))
        updateProgress({
          currentFileName: item.file.name,
          currentMessage: '변환 실패',
        })
      }
    }

    setResults(nextResults)
    setBatchProgress({
      totalFiles: sourceItems.length,
      completedFiles,
      successFiles,
      failedFiles,
      currentFileName: '',
      currentMessage: failedFiles ? `성공 ${successFiles}개 / 실패 ${failedFiles}개` : `총 ${successFiles}개 파일 완료`,
    })

    if (failed.length) {
      const summary = failed.slice(0, 2).map((item) => `${item.name}: ${item.reason}`).join(' · ')
      setNotice(`${successFiles}개 성공, ${failedFiles}개 실패${summary ? ` · ${summary}` : ''}`)
    } else {
      setNotice(`${nextResults.length}개 결과를 만들었습니다.`)
    }
    setIsProcessing(false)
  }

  const downloadOne = (item: ConvertedItem) => {
    const a = document.createElement('a')
    a.href = item.url
    a.download = item.filename
    a.click()
  }

  const downloadAllAsZip = async () => {
    if (!results.length) return
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    results.forEach((item) => {
      zip.file(item.filename, item.blob)
    })
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipUrl = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = zipUrl
    a.download = 'image-convert-tool-hub-results.zip'
    a.click()
    URL.revokeObjectURL(zipUrl)
  }

  type WorkbenchOptions = {
    includeHeading?: boolean
    includeFlowStrip?: boolean
    includePresetPanel?: boolean
    includeUploadBox?: boolean
  }

  const presetChoices = [
    {
      key: 'jpg',
      title: 'JPG로 변환',
      description: '호환성 우선',
      active: mode === 'convert' && targetFormat === 'image/jpeg',
      onClick: () => applyPreset({ mode: 'convert', format: 'image/jpeg', quality: 0.92 }),
    },
    {
      key: 'png',
      title: 'PNG로 변환',
      description: '선명도 우선',
      active: mode === 'convert' && targetFormat === 'image/png',
      onClick: () => applyPreset({ mode: 'convert', format: 'image/png', quality: 1 }),
    },
    {
      key: 'webp',
      title: 'WEBP로 변환',
      description: '웹 업로드용',
      active: mode === 'convert' && targetFormat === 'image/webp',
      onClick: () => applyPreset({ mode: 'convert', format: 'image/webp', quality: 0.86 }),
    },
    {
      key: 'optimize',
      title: '압축 / 리사이즈',
      description: '용량 먼저 줄이기',
      active: mode === 'optimize',
      onClick: () => applyPreset({ mode: 'optimize', format: targetFormat, quality: 0.8, resizeEnabled: true }),
    },
  ]

  const renderPresetButtons = (cardClassName = 'preset-card') =>
    presetChoices.map((item) => (
      <button
        type="button"
        key={item.key}
        className={`${cardClassName}${item.active ? ' active' : ''}`}
        onClick={item.onClick}
        aria-pressed={item.active}
      >
        <div className="preset-card-top">
          <span className="preset-card-badge">{item.active ? '현재 선택' : '클릭 적용'}</span>
          <span className="preset-card-arrow" aria-hidden="true">→</span>
        </div>
        <strong>{item.title}</strong>
        <span>{item.description}</span>
      </button>
    ))

  const renderUploadBox = (className = 'upload-box') => (
    <label className={className}>
      <input type="file" multiple accept={FILE_INPUT_ACCEPT} onChange={handleFileChange} hidden />
      <div className="upload-box-top">
        <span className="upload-kicker">1. 업로드</span>
        <span className="upload-cta">파일 선택</span>
      </div>
      <strong>여러 이미지 파일 한 번에 올리기</strong>
      <span>{SUPPORTED_INPUT_COPY} 지원 · {RAW_INPUT_COPY}</span>
    </label>
  )

  const scrollToWorkbenchDetails = () => {
    document.getElementById('home-workspace-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const renderWorkbench = ({
    includeHeading = true,
    includeFlowStrip = true,
    includePresetPanel = true,
    includeUploadBox = true,
  }: WorkbenchOptions = {}) => (
    <div className="workbench-stack">
      <div className="tool-stage-grid">
        <section className="surface-card tool-panel main-tool-panel">
          {includeHeading ? (
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">작업 공간</p>
                <h1>이미지 변환 / 압축 도구</h1>
                <p>파일을 올리고 설정만 확인하면 바로 일괄 변환할 수 있습니다.</p>
              </div>
            </div>
          ) : null}

          {includeFlowStrip ? (
            <section className="flow-strip-shell" aria-label="작업 흐름 안내">
              <div className="flow-strip-head">
                <p className="eyebrow">작업 흐름 안내</p>
                <span>아래 순서대로 진행하면 됩니다.</span>
              </div>
              <div className="flow-strip" aria-label="작업 흐름">
                {[
                  { step: 1, title: '업로드', detail: '파일 선택' },
                  { step: 2, title: '설정', detail: '형식 / 품질' },
                  { step: 3, title: '변환', detail: '일괄 처리' },
                  { step: 4, title: '다운로드', detail: '개별 / ZIP' },
                ].map((item) => {
                  const stateClass = currentFlowStep === item.step ? 'is-current' : currentFlowStep > item.step ? 'is-done' : ''
                  return (
                    <div key={item.step} className={`flow-step ${stateClass}`.trim()}>
                      <span className="flow-index">{item.step}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {includePresetPanel ? (
            <section className="preset-panel compact-preset-panel">
              <div className="preset-panel-head">
                <p className="eyebrow">원클릭 프리셋</p>
                <span>클릭하면 아래 설정에 바로 반영됩니다.</span>
              </div>
              <div className="preset-grid">{renderPresetButtons()}</div>
            </section>
          ) : null}

          <form className="tool-form-shell" onSubmit={handleSubmit}>
            <div className="toolbar-row">
              <button type="button" className={mode === 'convert' ? 'segmented active' : 'segmented'} onClick={() => setMode('convert')}>
                포맷 변환
              </button>
              <button type="button" className={mode === 'optimize' ? 'segmented active' : 'segmented'} onClick={() => setMode('optimize')}>
                압축 / 리사이즈
              </button>
            </div>

            {includeUploadBox ? renderUploadBox() : <p className="helper-text muted-helper-text">파일 업로드는 위쪽 큰 박스에서 먼저 진행해 주세요.</p>}

            {sourceItems.length ? (
              <div className="inline-info-card source-file-card">
                <div className="source-file-card-head">
                  <div>
                    <strong>{sourceItems.length}개 파일 업로드 완료</strong>
                    <p>입력 형식: {[...new Set(sourceItems.map((item) => mimeToLabel(item.mimeType)))].join(', ')}</p>
                  </div>
                  <span className="helper-pill">특수 파일은 아래에서 개별 설정</span>
                </div>
                <div className="source-note-list full-list">
                  {sourceItems.map((item) => {
                    const status = batchStatuses[item.id]
                    const statusClass = status ? `status-chip ${status.state}` : 'status-chip idle'
                    const gifModeForItem = getGifOutputModeForItem(item)
                    const svgScaleForItem = getSvgRasterScaleForItem(item)

                    return (
                      <div key={item.id} className="source-note-item rich-item">
                        <div className="source-note-head">
                          <div>
                            <strong>{item.file.name}</strong>
                            <span>
                              {mimeToLabel(item.mimeType)} · {item.sizeLabel}
                              {item.pageCount ? ` · ${item.pageCount}페이지` : ''}
                              {item.animated ? ` · 애니메이션 ${item.frameCount ?? 0}프레임` : ''}
                            </span>
                          </div>
                          <span className={statusClass}>{status?.state === 'queued' ? '대기' : status?.state === 'processing' ? '처리 중' : status?.state === 'success' ? '완료' : status?.state === 'error' ? '실패' : '준비'}</span>
                        </div>

                        {item.note ? <small>{item.note}</small> : null}

                        {item.animated || item.mimeType === 'image/svg+xml' ? (
                          <div className="file-option-grid">
                            {item.animated ? (
                              <label className="mini-field">
                                <span>GIF 처리</span>
                                <select value={gifModeForItem} onChange={(event) => updateGifFileOption(item.id, event.target.value as GifOutputMode)} disabled={isProcessing}>
                                  <option value="poster">대표 프레임 1장</option>
                                  <option value="sheet">프레임 시트 1장</option>
                                </select>
                              </label>
                            ) : null}
                            {item.mimeType === 'image/svg+xml' ? (
                              <label className="mini-field">
                                <span>SVG 선명도</span>
                                <select value={String(svgScaleForItem)} onChange={(event) => updateSvgFileOption(item.id, Number(event.target.value) as SvgRasterScale)} disabled={isProcessing}>
                                  <option value="1">빠르게</option>
                                  <option value="2">균형형</option>
                                  <option value="3">선명하게</option>
                                </select>
                              </label>
                            ) : null}
                          </div>
                        ) : null}

                        {item.animated || item.mimeType === 'image/svg+xml' ? (
                          <small className="option-hint">
                            {item.animated ? `이 파일은 ${gifModeForItem === 'sheet' ? '프레임 시트' : '대표 프레임'} 기준으로 처리합니다.` : ''}
                            {item.animated && item.mimeType === 'image/svg+xml' ? ' ' : ''}
                            {item.mimeType === 'image/svg+xml' ? `SVG는 ${svgRasterScaleLabel(svgScaleForItem)} 모드로 래스터라이즈합니다.` : ''}
                          </small>
                        ) : null}

                        {status ? (
                          <small className={status.error ? 'status-detail error' : 'status-detail'}>
                            {status.message}
                            {status.outputCount ? ` · 결과 ${status.outputCount}개` : ''}
                            {status.error ? ` · ${status.error}` : ''}
                          </small>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="section-label">
              <span className="section-step">2</span>
              <div className="section-copy">
                <strong>출력 설정</strong>
                <small>형식, 품질, 크기를 고릅니다.</small>
              </div>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>출력 형식</span>
                <select value={targetFormat} onChange={(event) => setTargetFormat(event.target.value as TargetFormat)}>
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </label>
              <label className="field">
                <span>품질 / 압축 정도</span>
                <input type="range" min="0.4" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} disabled={qualityDisabled} />
                <small>{qualityDisabled ? 'PNG는 주로 무손실 저장에 가깝습니다.' : `${Math.round(quality * 100)}%`}</small>
              </label>
            </div>

            <p className="helper-text">{qualityHelper}</p>

            {isTransparentToJpg ? (
              <div className="warning-box">
                <strong>투명 배경 주의</strong>
                <p>PNG, WEBP, GIF, SVG, PSD, 일부 TIFF를 JPG로 바꾸면 투명 배경이 흰색으로 채워질 수 있습니다.</p>
              </div>
            ) : null}

            {hasAnimatedGif ? (
              <>
                <div className="field-grid">
                  <label className="field">
                    <span>애니메이션 GIF 처리 방식</span>
                    <select value={gifOutputMode} onChange={(event) => setGifOutputMode(event.target.value as GifOutputMode)}>
                      <option value="poster">대표 프레임 1장으로 변환</option>
                      <option value="sheet">프레임 시트 1장으로 정리</option>
                    </select>
                    <small>{effectiveGifSummary.helperText}</small>
                  </label>
                </div>
                <div className="warning-box">
                  <strong>애니메이션 GIF 안내</strong>
                  <p>{effectiveGifSummary.noticeText}</p>
                </div>
              </>
            ) : null}

            {hasSvgInput ? (
              <div className="warning-box">
                <strong>SVG 래스터라이즈 안내</strong>
                <p>SVG는 width/height와 viewBox를 우선 읽어 픽셀 크기를 정합니다. 정보가 부족한 파일은 1024px 기준으로 안전하게 처리하고, 파일별로 선명도 우선/속도 우선도 조절할 수 있습니다. JPG로 저장하면 배경은 흰색으로 채워집니다.</p>
              </div>
            ) : null}

            <label className="checkbox-row">
              <input type="checkbox" checked={resizeEnabled} onChange={(event) => setResizeEnabled(event.target.checked)} />
              <span>크기 조절도 같이 적용</span>
            </label>

            {resizeEnabled ? (
              <>
                <label className="checkbox-row compact-checkbox">
                  <input type="checkbox" checked={keepAspectRatio} onChange={(event) => setKeepAspectRatio(event.target.checked)} />
                  <span>비율 유지</span>
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>가로(px)</span>
                    <input value={resizeWidth} onChange={(event) => updateResizeWidth(event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="field">
                    <span>세로(px)</span>
                    <input value={resizeHeight} onChange={(event) => updateResizeHeight(event.target.value)} inputMode="numeric" />
                  </label>
                </div>
              </>
            ) : null}

            <div className="section-label action-section-label">
              <span className="section-step">3</span>
              <div className="section-copy">
                <strong>{mode === 'convert' ? `${targetLabel}로 변환 실행` : '압축 / 리사이즈 실행'}</strong>
                <small>설정이 맞으면 아래 버튼으로 바로 시작하세요.</small>
              </div>
            </div>

            {batchProgress ? (
              <div className="progress-box" aria-live="polite">
                <div className="progress-head">
                  <strong>{isProcessing ? '일괄 처리 진행 중' : '최근 처리 결과'}</strong>
                  <span>{batchProgress.completedFiles} / {batchProgress.totalFiles}개 파일</span>
                </div>
                <div className="progress-bar" role="progressbar" aria-valuenow={batchProgressPercent} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${batchProgressPercent}%` }} />
                </div>
                <p>
                  {batchProgress.currentFileName ? `${batchProgress.currentFileName} · ${batchProgress.currentMessage}` : batchProgress.currentMessage}
                </p>
                <small>성공 {batchProgress.successFiles}개 · 실패 {batchProgress.failedFiles}개</small>
              </div>
            ) : null}

            {notice ? <p className="notice-text">{notice}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={!sourceItems.length || isProcessing}>
                {isProcessing ? '일괄 처리 중...' : mode === 'convert' ? `${targetLabel}로 일괄 변환` : '일괄 압축 / 리사이즈 시작'}
              </button>
              {sourceItems.length ? (
                <button type="button" className="ghost-button" onClick={clearAllFiles}>
                  파일 목록 비우기
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      <section className="surface-soft workbench-summary-panel quiet-panel" aria-label="작업 요약">
        <div className="workbench-summary-head">
          <div>
            <p className="eyebrow">status</p>
            <h2>작업 요약</h2>
            <p>메인 작업 아래에서 현재 단계와 설정만 가볍게 확인할 수 있습니다.</p>
          </div>
          {results.length ? (
            <button type="button" className="secondary-button" onClick={downloadAllAsZip}>
              ZIP으로 전체 다운로드
            </button>
          ) : null}
        </div>

        <div className="workbench-summary-grid">
          <article className="summary-card calm-summary-card">
            <p className="card-kicker">지금 단계</p>
            <strong>{flowSummaryTitle}</strong>
            <p>{flowSummaryText}</p>
          </article>

          <article className="summary-card calm-summary-card">
            <p className="card-kicker">현재 설정</p>
            {sourceItems.length ? (
              <ul className="bullet-list tight">
                <li>선택 파일 수: {sourceItems.length}개</li>
                <li>첫 파일 형식: {originalLabel}</li>
                <li>출력 형식: {targetLabel}</li>
                <li>처리 모드: {mode === 'convert' ? '포맷 변환' : '압축 / 리사이즈'}</li>
                {hasAnimatedGif ? <li>GIF 처리: {effectiveGifSummary.label}</li> : null}
              </ul>
            ) : (
              <p>파일을 올리면 여기서 현재 설정과 진행 단계를 확인할 수 있습니다.</p>
            )}
          </article>

          <article className={`summary-card ${results.length ? 'action-summary-card' : 'calm-summary-card'}`}>
            <p className="card-kicker">참고</p>
            {results.length ? (
              <>
                <strong>다운로드 준비 완료</strong>
                <p>생성 결과 {results.length}개 · 출력 형식 {mimeToLabel(results[0].mimeType)}</p>
                {batchProgress ? <small>성공 {batchProgress.successFiles}개 · 실패 {batchProgress.failedFiles}개</small> : null}
              </>
            ) : (
              <>
                <strong>지원 형식</strong>
                <p>{SUPPORTED_INPUT_COPY}</p>
                <small>{RAW_INPUT_COPY}</small>
              </>
            )}
          </article>
        </div>
      </section>

      {sourceItems.length ? (
        <section className="surface-card preview-panel">
          <div className="preview-header-row">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>선택 파일과 변환 결과 일부 미리보기</h2>
            </div>
          </div>
          <div className="preview-compare-grid">
            <div className="preview-card">
              <strong>첫 번째 원본</strong>
              <img className="preview-image" src={firstSource?.previewUrl} alt="첫 번째 원본 미리보기" />
            </div>
            <div className="preview-card">
              <strong>{firstResult ? '첫 번째 변환 결과' : '결과 미리보기 대기 중'}</strong>
              {firstResult ? <img className="preview-image" src={firstResult.url} alt="첫 번째 변환 결과 미리보기" /> : <div className="preview-placeholder">일괄 변환 후 여기에 첫 번째 결과가 표시됩니다.</div>}
            </div>
          </div>
        </section>
      ) : null}

      {results.length ? (
        <section className="surface-card preview-panel">
          <div className="preview-header-row">
            <div>
              <p className="eyebrow">Results</p>
              <h2>변환 결과 목록</h2>
            </div>
          </div>
          <div className="results-list">
            {results.map((item) => {
              const sourceName = sourceItems.find((source) => source.id === item.sourceId)?.file.name
              return (
                <article key={item.id} className="result-row">
                  <div>
                    <strong>{item.filename}</strong>
                    <p>{mimeToLabel(item.mimeType)} · {item.width} × {item.height}px · {item.sizeLabel} · {item.reductionText}</p>
                    {sourceName ? <small>원본: {sourceName}</small> : null}
                  </div>
                  <button type="button" className="secondary-button" onClick={() => downloadOne(item)}>
                    개별 다운로드
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )

  const renderHome = () => (
    <div className="page-stack tool-home-stack">
      <section className="workspace-shell home-hero-shell">
        <div className="home-hero-copy">
          <p className="workspace-label">image utility</p>
          <h1>이미지 변환 툴 허브</h1>
          <p className="workspace-subtitle">파일을 올리고 원하는 작업만 고르면 됩니다.</p>
        </div>

        <div className="home-primary-grid">
          {renderUploadBox('upload-box home-upload-box')}

          <section className="surface-soft home-tool-choice-panel">
            <div className="home-tool-choice-head">
              <div>
                <p className="eyebrow">2. 툴 선택</p>
                <h2>어떤 작업을 할까요?</h2>
                <p>선택한 작업은 바로 아래 세부 설정에 반영됩니다.</p>
              </div>
              <span className="helper-pill home-selected-pill">{mode === 'optimize' ? '압축 / 리사이즈' : `${targetLabel} 변환`}</span>
            </div>
            <div className="preset-grid home-choice-grid">{renderPresetButtons('preset-card home-preset-card')}</div>
            <div className="home-choice-footer">
              <span>{sourceItems.length ? `${sourceItems.length}개 파일 준비됨` : '업로드 후 아래에서 바로 이어서 작업하면 됩니다.'}</span>
              <button type="button" className="ghost-button" onClick={scrollToWorkbenchDetails}>
                세부 설정 보기
              </button>
            </div>
          </section>
        </div>
      </section>

      <section id="home-workspace-detail" className="workspace-shell home-detail-shell">
        <div className="section-heading home-detail-heading">
          <div>
            <p className="eyebrow">workspace</p>
            <h2>세부 설정 / 결과</h2>
            <p>품질, 크기, 특수 파일 옵션은 아래에서 조절하세요.</p>
          </div>
        </div>
        {renderWorkbench({ includeHeading: false, includeFlowStrip: false, includePresetPanel: false, includeUploadBox: false })}
      </section>

      <section className="home-reading-section">
        <div className="section-heading home-reading-heading">
          <div>
            <p className="eyebrow">안내</p>
            <h2>설명은 아래에만 모았습니다</h2>
            <p>먼저 작업하고, 필요할 때만 읽을 수 있게 짧게 정리했습니다.</p>
          </div>
        </div>

        <div className="utility-dock-grid home-reading-grid">
          <article className="quiet-panel dock-card dock-info-card static-info-card">
            <p className="card-kicker">지원 범위</p>
            <h3>바로 처리 가능한 작업</h3>
            <ul className="bullet-list tight">
              <li>여러 파일 일괄 변환</li>
              <li>JPG / PNG / WEBP 출력</li>
              <li>HEIC / HEIF / PDF / TIFF / PSD 입력</li>
              <li>압축 품질 조절 + 비율 유지 리사이즈</li>
            </ul>
          </article>
          <article className="quiet-panel dock-card dock-info-card static-info-card">
            <p className="card-kicker">처리 방식</p>
            <h3>파일은 가능한 브라우저 안에서 처리</h3>
            <p>업로드 파일을 장기 보관하지 않는 방향으로 설계하고 있습니다. 민감한 파일이라면 변환 전에 한 번 더 확인해 주세요.</p>
          </article>
          <article className="quiet-panel dock-card guide-dock-card">
            <p className="card-kicker">가이드</p>
            <h3>설명이 더 필요하면 여기서만 읽기</h3>
            <div className="mini-guide-list">
              {guides.slice(0, 3).map((guide) => (
                <button key={guide.slug} type="button" className="mini-guide-item" onClick={() => navigate(`/guides/${guide.slug}`)}>
                  <strong>{guide.title}</strong>
                  <span>{guide.readingTime}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  )

  const renderToolPage = () => (
    <div className="page-stack tool-page-stack">
      <section className="workspace-shell compact-shell">
        <div className="workspace-topbar compact-topbar">
          <div>
            <p className="workspace-label">tool workspace</p>
            <h1>이미지 변환 작업화면</h1>
            <p className="workspace-subtitle">업로드 → 설정 → 변환 → 다운로드 흐름으로 바로 작업할 수 있습니다.</p>
          </div>
        </div>
        {renderWorkbench()}
      </section>
    </div>
  )

  const renderCurrentRoute = () => {
    if (path === '/') return renderHome()
    if (path === '/tool') return renderToolPage()
    if (path === '/guides') return <GuideList onNavigate={navigate} />
    if (currentGuide) return <GuideDetail guide={currentGuide} />
    if (staticPages[staticKey as keyof typeof staticPages]) return <StaticPage pageKey={staticKey} />

    return (
      <section className="page-stack">
        <article className="surface-card detail-header">
          <p className="eyebrow">Not Found</p>
          <h1>페이지를 찾을 수 없습니다</h1>
          <button type="button" className="primary-button" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </article>
      </section>
    )
  }

  const footerItems = [
    { label: '소개', path: '/about' },
    { label: '방법론', path: '/methodology' },
    { label: '개인정보처리방침', path: '/privacy' },
    { label: '이용안내', path: '/terms' },
    { label: 'FAQ', path: '/faq' },
    { label: '문의', path: '/contact' },
  ]

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <button type="button" className="brand-block" onClick={() => navigate('/')}>
            <span className="brand-mark">IH</span>
            <span>
              <strong>{siteInfo.name}</strong>
              <small>{siteInfo.shortName}</small>
            </span>
          </button>
          <nav className="nav-links">
            <button type="button" onClick={() => navigate('/tool')}>변환 도구</button>
            <button type="button" onClick={() => navigate('/guides')}>가이드</button>
            <button type="button" onClick={() => navigate('/contact')}>문의</button>
          </nav>
        </div>
      </header>

      <main className="container main-shell">{renderCurrentRoute()}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <strong>{siteInfo.name}</strong>
            <p>{siteInfo.description}</p>
            <a className="footer-contact-link" href={`mailto:${siteInfo.contactEmail}`}>
              운영 이메일 · {siteInfo.contactEmail}
            </a>
          </div>
          <div className="footer-links">
            {footerItems.map((item) => (
              <button key={item.path} type="button" className="footer-link" onClick={() => navigate(item.path)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
