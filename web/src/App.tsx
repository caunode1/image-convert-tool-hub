import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'
import { guides, siteInfo, staticPages, type Guide } from './siteContent'

type ToolMode = 'convert' | 'optimize'
type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp'

type ConvertedFile = {
  blob: Blob
  filename: string
  sizeLabel: string
  mimeType: TargetFormat
  width: number
  height: number
  reductionText: string
}

type OriginalInfo = {
  width: number
  height: number
  sizeLabel: string
  mimeType: string
  filename: string
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

function mimeToLabel(mime: TargetFormat) {
  if (mime === 'image/jpeg') return 'JPG'
  if (mime === 'image/png') return 'PNG'
  return 'WEBP'
}

function mimeToExtension(mime: TargetFormat) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  return 'webp'
}

function mimeFromFile(file: File) {
  if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp') return file.type
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'application/octet-stream'
}

function originalMimeToTarget(mime: string): TargetFormat {
  if (mime === 'image/png') return 'image/png'
  if (mime === 'image/webp') return 'image/webp'
  return 'image/jpeg'
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

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file)
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

async function convertFile(options: {
  file: File
  targetFormat: TargetFormat
  quality: number
  resizeWidth?: number
  resizeHeight?: number
}) {
  const image = await loadImage(options.file)
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

  return {
    blob,
    width,
    height,
  }
}

function GuideList({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="page-stack">
      <div className="section-heading left-align narrow">
        <p className="eyebrow">Guides</p>
        <h1>이미지 변환 전에 읽어두면 좋은 가이드</h1>
        <p>포맷 차이, 화질 저하, 용량 줄이기 같은 내용을 실제 사용 기준으로 정리했습니다.</p>
      </div>
      <div className="card-grid">
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
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('image/jpeg')
  const [quality, setQuality] = useState(0.9)
  const [resizeEnabled, setResizeEnabled] = useState(false)
  const [keepAspectRatio, setKeepAspectRatio] = useState(true)
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')
  const [originalInfo, setOriginalInfo] = useState<OriginalInfo | null>(null)
  const [result, setResult] = useState<ConvertedFile | null>(null)
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const downloadUrlRef = useRef<string>('')

  const currentGuide = useMemo(() => guides.find((guide) => `/guides/${guide.slug}` === path) ?? null, [path])
  const staticKey = useMemo(() => path.replace('/', ''), [path])

  const seoMeta = useMemo(() => {
    if (currentGuide) return { title: `${currentGuide.title} | ${siteInfo.name}`, description: currentGuide.description }
    if (path === '/guides') return { title: `가이드 모음 | ${siteInfo.name}`, description: '이미지 변환, 압축, 리사이즈와 관련된 실용 가이드를 모아 둔 페이지입니다.' }
    if (path === '/about') return { title: `소개 | ${siteInfo.name}`, description: staticPages.about.description }
    if (path === '/methodology') return { title: `방법론 | ${siteInfo.name}`, description: staticPages.methodology.description }
    if (path === '/privacy') return { title: `개인정보처리방침 | ${siteInfo.name}`, description: staticPages.privacy.description }
    if (path === '/terms') return { title: `이용안내 | ${siteInfo.name}`, description: staticPages.terms.description }
    if (path === '/contact') return { title: `문의 | ${siteInfo.name}`, description: staticPages.contact.description }
    if (path === '/faq') return { title: `자주 묻는 질문 | ${siteInfo.name}`, description: staticPages.faq.description }
    return { title: `${siteInfo.name} | 브라우저에서 바로 쓰는 이미지 변환 도구`, description: siteInfo.description }
  }, [currentGuide, path])

  const originalMime = originalInfo?.mimeType ?? ''
  const targetLabel = mimeToLabel(targetFormat)
  const originalLabel = originalMime === 'application/octet-stream' ? '알 수 없음' : originalMime.replace('image/', '').toUpperCase()
  const isTransparentToJpg = targetFormat === 'image/jpeg' && (originalMime === 'image/png' || originalMime === 'image/webp')
  const qualityDisabled = targetFormat === 'image/png'
  const qualityHelper = qualityDisabled
    ? 'PNG는 품질 슬라이더 영향이 작고, 주로 크기 조절이 용량에 더 크게 작용해요.'
    : mode === 'optimize'
      ? '용량을 많이 줄이고 싶다면 70~85%부터 비교해 보세요.'
      : '일반 사진은 85~92% 정도면 품질과 용량 균형이 좋은 편입니다.'

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
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
    }
  }, [resultUrl])

  const navigate = (nextPath: string) => {
    const normalized = normalizePath(nextPath)
    if (normalized === path) return
    window.history.pushState({}, '', normalized)
    setPath(normalized)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    const mimeType = mimeFromFile(nextFile)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
      setError('현재 MVP에서는 PNG, JPG, WEBP 파일만 지원합니다.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
    setResult(null)
    setResultUrl('')
    setError('')
    setNotice('')

    try {
      const preview = URL.createObjectURL(nextFile)
      setFile(nextFile)
      setPreviewUrl(preview)
      setTargetFormat(originalMimeToTarget(mimeType))
      const img = await loadImage(nextFile)
      setOriginalInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeLabel: formatBytes(nextFile.size),
        mimeType,
        filename: nextFile.name,
      })
      setResizeWidth(String(img.naturalWidth))
      setResizeHeight(String(img.naturalHeight))
      setNotice('파일을 불러왔어요. 바로 변환하거나, 품질과 크기를 조정해보세요.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 파일을 읽을 수 없습니다.')
    }
  }

  const applyPreset = (next: { mode: ToolMode; format: TargetFormat; quality: number; resizeEnabled?: boolean }) => {
    setMode(next.mode)
    setTargetFormat(next.format)
    setQuality(next.quality)
    setResizeEnabled(Boolean(next.resizeEnabled))
    setNotice(`${mimeToLabel(next.format)} 기준 프리셋을 적용했어요.`)
  }

  const updateResizeWidth = (value: string) => {
    setResizeWidth(value)
    if (!keepAspectRatio || !originalInfo) return
    const width = Number(value)
    if (!Number.isFinite(width) || width <= 0) return
    const nextHeight = Math.max(1, Math.round((width / originalInfo.width) * originalInfo.height))
    setResizeHeight(String(nextHeight))
  }

  const updateResizeHeight = (value: string) => {
    setResizeHeight(value)
    if (!keepAspectRatio || !originalInfo) return
    const height = Number(value)
    if (!Number.isFinite(height) || height <= 0) return
    const nextWidth = Math.max(1, Math.round((height / originalInfo.height) * originalInfo.width))
    setResizeWidth(String(nextWidth))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file || !originalInfo) {
      setError('먼저 이미지 파일을 올려 주세요.')
      return
    }

    const parsedWidth = resizeEnabled && resizeWidth ? Number(resizeWidth) : undefined
    const parsedHeight = resizeEnabled && resizeHeight ? Number(resizeHeight) : undefined

    if (resizeEnabled && ((parsedWidth && parsedWidth <= 0) || (parsedHeight && parsedHeight <= 0))) {
      setError('리사이즈 값은 1px 이상이어야 해요.')
      return
    }

    setIsProcessing(true)
    setError('')
    setNotice('')

    try {
      const converted = await convertFile({
        file,
        targetFormat,
        quality,
        resizeWidth: parsedWidth,
        resizeHeight: parsedHeight,
      })

      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
      if (resultUrl) URL.revokeObjectURL(resultUrl)

      const objectUrl = URL.createObjectURL(converted.blob)
      downloadUrlRef.current = objectUrl
      setResultUrl(objectUrl)
      const filename = `${fileNameWithoutExtension(file.name)}-converted.${mimeToExtension(targetFormat)}`

      setResult({
        blob: converted.blob,
        filename,
        sizeLabel: formatBytes(converted.blob.size),
        mimeType: targetFormat,
        width: converted.width,
        height: converted.height,
        reductionText: formatReduction(file.size, converted.blob.size),
      })
      setNotice('변환이 완료됐어요. 미리보기와 용량 변화를 확인한 뒤 다운로드하면 됩니다.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (!result || !downloadUrlRef.current) return
    const a = document.createElement('a')
    a.href = downloadUrlRef.current
    a.download = result.filename
    a.click()
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
                <p>바로 파일 올리고 변환하면 되는 구조로 잡았어. 설명은 아래에 있고, 먼저 도구부터 쓸 수 있게 만들었어.</p>
              </div>
              <div className="proof-row compact-proof-row">
                <span className="proof-chip">브라우저 처리 우선</span>
                <span className="proof-chip">설치 없음</span>
                <span className="proof-chip">다운로드 즉시 가능</span>
              </div>
            </div>
          ) : (
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Tool</p>
                <h1>이미지 변환 / 압축 도구</h1>
                <p>파일 이름만 바꾸는 가짜 변환이 아니라, 실제 새 파일을 만들어 내려받는 방식이에요.</p>
              </div>
            </div>
          )}

          <section className="preset-panel compact-preset-panel">
            <div className="preset-panel-head">
              <p className="eyebrow">빠른 작업</p>
              <span>자주 쓰는 변환을 바로 고를 수 있어요</span>
            </div>
            <div className="preset-grid">
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/jpeg', quality: 0.92 })}>
                <strong>WEBP → JPG</strong>
                <span>호환성 우선 / 사진 공유용</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/png', quality: 1 })}>
                <strong>JPG → PNG</strong>
                <span>그래픽/배경 보존용</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'convert', format: 'image/webp', quality: 0.86 })}>
                <strong>JPG → WEBP</strong>
                <span>웹 업로드/용량 절약용</span>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset({ mode: 'optimize', format: targetFormat, quality: 0.8, resizeEnabled: true })}>
                <strong>용량 줄이기</strong>
                <span>압축 + 리사이즈부터 바로 시작</span>
              </button>
            </div>
          </section>

          <form className="tool-form-shell" onSubmit={handleSubmit}>
            <div className="toolbar-row">
              <button type="button" className={mode === 'convert' ? 'segmented active' : 'segmented'} onClick={() => setMode('convert')}>
                포맷 변환
              </button>
              <button type="button" className={mode === 'optimize' ? 'segmented active' : 'segmented'} onClick={() => setMode('optimize')}>
                압축/리사이즈
              </button>
            </div>

            <label className="upload-box">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} hidden />
              <strong>이미지 파일 업로드</strong>
              <span>PNG, JPG, WEBP 파일을 올리면 브라우저 안에서 바로 처리합니다.</span>
            </label>

            {originalInfo ? (
              <div className="inline-info-card">
                <strong>{originalInfo.filename}</strong>
                <p>
                  원본 형식 {originalLabel} · {originalInfo.width} × {originalInfo.height}px · {originalInfo.sizeLabel}
                </p>
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
                <p>PNG/WEBP를 JPG로 바꾸면 투명 배경이 흰색으로 채워질 수 있어요.</p>
              </div>
            ) : null}

            {originalMime === targetFormat ? (
              <div className="helper-box">
                <strong>같은 포맷으로 다시 저장</strong>
                <p>지금 설정은 포맷 변경보다는 품질 조절이나 리사이즈 목적에 더 가깝습니다.</p>
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
              <button type="submit" className="primary-button" disabled={!file || isProcessing}>
                {isProcessing ? '처리 중...' : mode === 'convert' ? `${targetLabel}로 변환` : '압축/리사이즈 시작'}
              </button>
            </div>
          </form>
        </section>

        <aside className="surface-card side-panel">
          <h2>현재 파일 정보</h2>
          {originalInfo ? (
            <ul className="bullet-list tight">
              <li>원본 형식: {originalLabel}</li>
              <li>크기: {originalInfo.width} × {originalInfo.height}px</li>
              <li>원본 용량: {originalInfo.sizeLabel}</li>
              <li>출력 형식: {targetLabel}</li>
              <li>처리 모드: {mode === 'convert' ? '포맷 변환' : '압축/리사이즈'}</li>
            </ul>
          ) : (
            <p>파일을 올리면 여기서 크기와 용량을 바로 볼 수 있어요.</p>
          )}

          {result ? (
            <div className="result-box">
              <strong>처리 완료</strong>
              <p>출력 형식: {mimeToLabel(result.mimeType)}</p>
              <p>결과 크기: {result.width} × {result.height}px</p>
              <p>결과 용량: {result.sizeLabel}</p>
              <p>원본 대비: {result.reductionText}</p>
              <button type="button" className="secondary-button full-width" onClick={downloadResult}>
                {result.filename} 다운로드
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      {previewUrl ? (
        <section className="surface-card preview-panel">
          <div className="preview-header-row">
            <div>
              <p className="eyebrow">Preview</p>
              <h2>변환 전 / 후 비교</h2>
            </div>
          </div>
          <div className="preview-compare-grid">
            <div className="preview-card">
              <strong>원본</strong>
              <img className="preview-image" src={previewUrl} alt="업로드한 원본 미리보기" />
            </div>
            <div className="preview-card">
              <strong>{resultUrl ? '변환 결과' : '결과 미리보기 대기 중'}</strong>
              {resultUrl ? <img className="preview-image" src={resultUrl} alt="변환 결과 미리보기" /> : <div className="preview-placeholder">변환 후 여기에 결과가 표시됩니다.</div>}
            </div>
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
            <p className="workspace-subtitle">들어오자마자 바로 변환하고, 필요한 설명은 아래에서 짧게 확인하는 툴 중심 구조로 바꿨어.</p>
          </div>
          <div className="workspace-mini-stats">
            <span>WEBP / JPG / PNG</span>
            <span>브라우저 처리 우선</span>
            <span>변환 + 압축 + 리사이즈</span>
          </div>
        </div>
        {renderWorkbench(true)}
      </section>

      <section className="utility-dock-grid">
        <article className="surface-card dock-card">
          <p className="card-kicker">지원 작업</p>
          <h3>지금 바로 많이 쓰는 이미지 작업</h3>
          <ul className="bullet-list tight">
            <li>WEBP → JPG/PNG</li>
            <li>JPG/PNG → WEBP</li>
            <li>압축 품질 조절</li>
            <li>비율 유지 리사이즈</li>
          </ul>
        </article>
        <article className="surface-card dock-card">
          <p className="card-kicker">처리 원칙</p>
          <h3>가급적 브라우저 안에서 끝내는 방향</h3>
          <p>설치 없이 바로 쓰고, 업로드 파일을 장기 보관하지 않는 방향으로 설계하고 있어. 민감한 파일은 올리기 전에 한 번 더 확인하면 돼.</p>
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
            <p className="workspace-subtitle">파일 업로드 → 설정 확인 → 변환 → 비교 → 다운로드 흐름으로 바로 쓰면 돼.</p>
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
          <h1>페이지를 찾을 수 없어요</h1>
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
