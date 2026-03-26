import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import JSZip from 'jszip'
import heic2any from 'heic2any'
import { decompressFrames, parseGIF } from 'gifuct-js'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './App.css'
import { guides, siteInfo, staticPages, type Guide } from './siteContent'

type ToolMode = 'convert' | 'optimize'
type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

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
  return mime.replace('image/', '').toUpperCase()
}

function mimeToExtension(mime: TargetFormat) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  return 'webp'
}

function mimeFromFile(file: File) {
  if (
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/webp' ||
    file.type === 'image/bmp' ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.type === 'application/pdf'
  ) {
    return file.type
  }

  const lower = file.name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  if (lower.endsWith('.pdf')) return 'application/pdf'
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

async function loadImageFromBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
      el.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function renderPdfPageToPngBlob(file: File, pageNumber = 1) {
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('PDF 렌더링을 지원하지 않습니다.')
  await page.render({ canvas: null, canvasContext: ctx, viewport }).promise
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1))
  if (!blob) throw new Error('PDF 미리보기를 만들지 못했습니다.')
  return { blob, pageCount: pdf.numPages, width: canvas.width, height: canvas.height }
}

async function prepareSourceItem(file: File): Promise<SourceItem> {
  const mimeType = mimeFromFile(file)
  const id = `${file.name}-${file.lastModified}-${file.size}`

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    const converted = await heic2any({ blob: file, toType: 'image/png' })
    const blob = Array.isArray(converted) ? converted[0] : converted
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
      note: 'HEIC/HEIF 파일은 브라우저 호환성을 위해 먼저 PNG로 변환해 처리합니다.',
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

  if (mimeType === 'image/gif') {
    const parsed = parseGIF(await file.arrayBuffer())
    const frames = decompressFrames(parsed, false)
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
      animated: frames.length > 1,
      note: frames.length > 1 ? '애니메이션 GIF는 현재 첫 프레임 기준으로 변환합니다.' : undefined,
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

async function convertFile(options: {
  source: SourceItem
  targetFormat: TargetFormat
  quality: number
  resizeWidth?: number
  resizeHeight?: number
  pdfPageNumber?: number
}) {
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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('브라우저에서 이미지 변환을 지원하지 않습니다.')

  if (options.targetFormat === 'image/jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  ctx.drawImage(image, 0, 0, width, height)

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
  const [results, setResults] = useState<ConvertedItem[]>([])
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
  const isTransparentToJpg = targetFormat === 'image/jpeg' && (originalMime === 'image/png' || originalMime === 'image/webp' || originalMime === 'image/gif' || originalMime === 'image/svg+xml')
  const qualityDisabled = targetFormat === 'image/png'
  const qualityHelper = qualityDisabled
    ? 'PNG는 품질 슬라이더 영향이 작고, 주로 크기 조절이 용량에 더 크게 작용합니다.'
    : mode === 'optimize'
      ? '용량을 많이 줄이고 싶다면 70~85%부터 비교해 보시는 것을 권장합니다.'
      : '일반 사진은 85~92% 정도면 품질과 용량 균형이 좋은 편입니다. HEIC와 PDF는 내부적으로 이미지로 변환한 뒤 출력합니다.'

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
    setResults([])
    setResizeWidth('')
    setResizeHeight('')
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (!selected.length) return

    clearAllFiles()
    setError('')
    setNotice('')

    const supported: SourceItem[] = []
    const unsupportedNames: string[] = []

    for (const file of selected) {
      const mimeType = mimeFromFile(file)
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'application/pdf'].includes(mimeType)) {
        unsupportedNames.push(file.name)
        continue
      }

      try {
        supported.push(await prepareSourceItem(file))
      } catch {
        unsupportedNames.push(file.name)
      }
    }

    if (supported.length) {
      setSourceItems(supported)
      setResizeWidth(String(supported[0].width))
      setResizeHeight(String(supported[0].height))
      setNotice(`${supported.length}개 파일을 불러왔습니다.${unsupportedNames.length ? ` 지원하지 않는 파일 ${unsupportedNames.length}개는 제외했습니다.` : ''}`)
    } else {
      setError('현재는 JPG, PNG, WEBP, BMP, GIF, SVG, HEIC/HEIF, PDF 파일을 지원합니다.')
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
    setNotice('파일을 변환하고 있습니다...')
    results.forEach((item) => URL.revokeObjectURL(item.url))
    setResults([])

    const nextResults: ConvertedItem[] = []
    const failed: string[] = []

    for (const item of sourceItems) {
      try {
        if (item.mimeType === 'application/pdf') {
          const totalPages = item.pageCount ?? 1
          for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            const converted = await convertFile({
              source: item,
              targetFormat,
              quality,
              resizeWidth: parsedWidth,
              resizeHeight: parsedHeight,
              pdfPageNumber: pageNumber,
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
          })
          const url = URL.createObjectURL(converted.blob)
          nextResults.push({
            id: `${item.id}-${targetFormat}`,
            sourceId: item.id,
            filename: `${fileNameWithoutExtension(item.file.name)}-converted.${mimeToExtension(targetFormat)}`,
            sizeLabel: formatBytes(converted.blob.size),
            mimeType: targetFormat,
            width: converted.width,
            height: converted.height,
            reductionText: formatReduction(item.file.size, converted.blob.size),
            url,
            blob: converted.blob,
          })
        }
      } catch {
        failed.push(item.file.name)
      }
    }

    setResults(nextResults)
    if (failed.length) {
      setNotice(`${nextResults.length}개 파일 변환 완료, ${failed.length}개 파일은 변환에 실패했습니다.`)
    } else {
      setNotice(`${nextResults.length}개 파일 변환이 완료되었습니다.`)
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

  const renderWorkbench = (compact = false) => (
    <div className="workbench-stack">
      <div className="tool-stage-grid">
        <section className="surface-card tool-panel main-tool-panel">
          {compact ? (
            <div className="workspace-heading compact-workspace-heading">
              <div>
                <p className="eyebrow">Quick convert</p>
                <h1>이미지 변환 / 압축 도구</h1>
                <p>여러 이미지 파일을 한 번에 올리고, 필요한 형식으로 묶어서 변환하실 수 있습니다.</p>
              </div>
              <div className="proof-row compact-proof-row">
                <span className="proof-chip">여러 파일 일괄 처리</span>
                <span className="proof-chip">BMP / GIF / SVG / HEIC / PDF 지원</span>
                <span className="proof-chip">ZIP 다운로드</span>
              </div>
            </div>
          ) : (
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Tool</p>
                <h1>이미지 변환 / 압축 도구</h1>
                <p>여러 파일을 한 번에 변환하고, 결과를 ZIP으로 묶어 받으실 수 있습니다.</p>
              </div>
            </div>
          )}

          <section className="preset-panel compact-preset-panel">
            <div className="preset-panel-head">
              <p className="eyebrow">빠른 작업</p>
              <span>자주 쓰는 일괄 변환 작업을 바로 시작하실 수 있습니다.</span>
            </div>
            <div className="preset-grid">
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/jpeg', quality: 0.92 })}>
                <strong>여러 파일 → JPG</strong>
                <span>호환성 우선 / 사진 공유용</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/png', quality: 1 })}>
                <strong>여러 파일 → PNG</strong>
                <span>그래픽/선명도 우선</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/webp', quality: 0.86 })}>
                <strong>여러 파일 → WEBP</strong>
                <span>웹 업로드/용량 절약용</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'optimize', format: targetFormat, quality: 0.8, resizeEnabled: true })}>
                <strong>일괄 압축 / 리사이즈</strong>
                <span>여러 파일을 한 번에 줄입니다</span>
              </button>
            </div>
          </section>

          <form className="tool-form-shell" onSubmit={handleSubmit}>
            <div className="toolbar-row">
              <button type="button" className={mode === 'convert' ? 'segmented active' : 'segmented'} onClick={() => setMode('convert')}>
                포맷 변환
              </button>
              <button type="button" className={mode === 'optimize' ? 'segmented active' : 'segmented'} onClick={() => setMode('optimize')}>
                압축 / 리사이즈
              </button>
            </div>

            <label className="upload-box">
              <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,image/svg+xml,image/heic,image/heif,application/pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.svg,.heic,.heif,.pdf" onChange={handleFileChange} hidden />
              <strong>여러 이미지 파일 업로드</strong>
              <span>JPG, PNG, WEBP, BMP, GIF, SVG, HEIC, PDF 파일을 여러 개 한 번에 올릴 수 있습니다.</span>
            </label>

            {sourceItems.length ? (
              <div className="inline-info-card">
                <strong>{sourceItems.length}개 파일 준비 완료</strong>
                <p>입력 형식 예시: {[...new Set(sourceItems.map((item) => mimeToLabel(item.mimeType)))].join(', ')}</p>
                <div className="source-note-list">
                  {sourceItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="source-note-item">
                      <strong>{item.file.name}</strong>
                      <span>
                        {mimeToLabel(item.mimeType)} · {item.sizeLabel}
                        {item.pageCount ? ` · ${item.pageCount}페이지` : ''}
                        {item.animated ? ' · 애니메이션 감지' : ''}
                      </span>
                      {item.note ? <small>{item.note}</small> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

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
                <p>PNG, WEBP, GIF, SVG를 JPG로 바꾸면 투명 배경이 흰색으로 채워질 수 있습니다.</p>
              </div>
            ) : null}

            {sourceItems.some((item) => item.animated) ? (
              <div className="warning-box">
                <strong>애니메이션 GIF 안내</strong>
                <p>애니메이션 GIF는 현재 첫 프레임 기준으로 변환합니다. 전체 애니메이션 보존 변환은 다음 단계에서 추가할 예정입니다.</p>
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

        <aside className="surface-card side-panel">
          <h2>작업 요약</h2>
          {sourceItems.length ? (
            <ul className="bullet-list tight">
              <li>선택 파일 수: {sourceItems.length}개</li>
              <li>첫 파일 형식: {originalLabel}</li>
              <li>출력 형식: {targetLabel}</li>
              <li>처리 모드: {mode === 'convert' ? '포맷 변환' : '압축 / 리사이즈'}</li>
              <li>지원 입력: JPG, PNG, WEBP, BMP, GIF, SVG, HEIC, PDF</li>
            </ul>
          ) : (
            <p>여러 파일을 올리면 여기서 일괄 작업 요약을 확인하실 수 있습니다.</p>
          )}

          {results.length ? (
            <div className="result-box">
              <strong>처리 완료</strong>
              <p>완료 파일 수: {results.length}개</p>
              <p>출력 형식: {mimeToLabel(results[0].mimeType)}</p>
              <button type="button" className="secondary-button full-width" onClick={downloadAllAsZip}>
                ZIP으로 전체 다운로드
              </button>
            </div>
          ) : null}
        </aside>
      </div>

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
            {results.map((item) => (
              <article key={item.id} className="result-row">
                <div>
                  <strong>{item.filename}</strong>
                  <p>{mimeToLabel(item.mimeType)} · {item.width} × {item.height}px · {item.sizeLabel} · {item.reductionText}</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => downloadOne(item)}>
                  개별 다운로드
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )

  const renderHome = () => (
    <div className="page-stack tool-home-stack">
      <section className="workspace-shell">
        <div className="workspace-topbar">
          <div>
            <p className="workspace-label">image utility</p>
            <h1>이미지 변환 툴 허브</h1>
            <p className="workspace-subtitle">여러 이미지 파일을 한 번에 올리고, 필요한 형식으로 묶어서 변환하실 수 있는 툴 중심 구조로 정리했습니다.</p>
          </div>
          <div className="workspace-mini-stats">
            <span>JPG / PNG / WEBP</span>
            <span>BMP / GIF / SVG / HEIC / PDF</span>
            <span>일괄 변환 / ZIP 다운로드</span>
          </div>
        </div>
        {renderWorkbench(true)}
      </section>

      <section className="utility-dock-grid">
        <article className="surface-card dock-card">
          <p className="card-kicker">지원 작업</p>
          <h3>지금 바로 많이 쓰는 이미지 작업</h3>
          <ul className="bullet-list tight">
            <li>여러 파일 일괄 변환</li>
            <li>WEBP / JPG / PNG 상호 변환</li>
            <li>BMP / GIF / SVG / HEIC / HEIF / PDF 입력 지원</li>
            <li>압축 품질 조절 및 비율 유지 리사이즈</li>
          </ul>
        </article>
        <article className="surface-card dock-card">
          <p className="card-kicker">처리 원칙</p>
          <h3>가급적 브라우저 안에서 끝내는 방향</h3>
          <p>설치 없이 바로 사용하실 수 있고, 업로드 파일을 장기 보관하지 않는 방향으로 설계하고 있습니다. 민감한 파일은 업로드 전에 한 번 더 확인해 주세요.</p>
        </article>
        <article className="surface-card dock-card guide-dock-card">
          <p className="card-kicker">가이드</p>
          <h3>필요한 설명은 짧고 바로 읽히게</h3>
          <div className="mini-guide-list">
            {guides.slice(0, 3).map((guide) => (
              <button key={guide.slug} type="button" className="mini-guide-item" onClick={() => navigate(`/guides/${guide.slug}`)}>
                <strong>{guide.title}</strong>
                <span>{guide.readingTime}</span>
              </button>
            ))}
          </div>
        </article>
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
            <p className="workspace-subtitle">여러 파일 업로드 → 설정 확인 → 일괄 변환 → 비교 → ZIP 다운로드 흐름으로 바로 사용하실 수 있습니다.</p>
          </div>
        </div>
        {renderWorkbench(false)}
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
