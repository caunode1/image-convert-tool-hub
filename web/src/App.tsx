import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'
import { guides, siteInfo, staticPages, toolHighlights, type Guide } from './siteContent'

type ToolMode = 'convert' | 'optimize'
type TargetFormat = 'image/jpeg' | 'image/png' | 'image/webp'

type ConvertedFile = {
  blob: Blob
  filename: string
  sizeLabel: string
  mimeType: TargetFormat
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

function fileNameWithoutExtension(name: string) {
  return name.replace(/\.[^/.]+$/, '')
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

  return blob
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
  const [resizeWidth, setResizeWidth] = useState('')
  const [resizeHeight, setResizeHeight] = useState('')
  const [originalInfo, setOriginalInfo] = useState<{ width: number; height: number; sizeLabel: string } | null>(null)
  const [result, setResult] = useState<ConvertedFile | null>(null)
  const [error, setError] = useState('')
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
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
    }
  }, [previewUrl])

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

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
    setResult(null)
    setError('')

    try {
      const preview = URL.createObjectURL(nextFile)
      setFile(nextFile)
      setPreviewUrl(preview)
      const img = await loadImage(nextFile)
      setOriginalInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeLabel: formatBytes(nextFile.size),
      })
      setResizeWidth(String(img.naturalWidth))
      setResizeHeight(String(img.naturalHeight))
    } catch (e) {
      setError(e instanceof Error ? e.message : '이미지 파일을 읽을 수 없습니다.')
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) {
      setError('먼저 이미지 파일을 올려 주세요.')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const blob = await convertFile({
        file,
        targetFormat,
        quality,
        resizeWidth: resizeEnabled && resizeWidth ? Number(resizeWidth) : undefined,
        resizeHeight: resizeEnabled && resizeHeight ? Number(resizeHeight) : undefined,
      })

      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
      downloadUrlRef.current = URL.createObjectURL(blob)
      const filename = `${fileNameWithoutExtension(file.name)}-converted.${mimeToExtension(targetFormat)}`

      setResult({
        blob,
        filename,
        sizeLabel: formatBytes(blob.size),
        mimeType: targetFormat,
      })
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

  const renderHome = () => (
    <div className="page-stack">
      <section className="hero surface-card">
        <div className="hero-copy">
          <p className="eyebrow">브라우저에서 바로 쓰는 이미지 도구</p>
          <h1>WEBP, JPG, PNG 이미지를 설치 없이 바로 변환하고 압축해요</h1>
          <p className="lead-copy">
            일반 사용자가 검색해서 바로 쓸 수 있게 만든 실용형 이미지 툴 허브예요. 포맷 변환, 압축, 리사이즈를 빠르게 처리하고,
            왜 화질이 달라지는지까지 같이 설명합니다.
          </p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => navigate('/tool')}>
              변환 도구 바로 쓰기
            </button>
            <button type="button" className="secondary-button" onClick={() => navigate('/guides')}>
              가이드 먼저 보기
            </button>
          </div>
          <div className="proof-row">
            <span className="proof-chip">브라우저 처리 우선</span>
            <span className="proof-chip">설치 없이 바로 사용</span>
            <span className="proof-chip">정책/문의 페이지 공개</span>
          </div>
        </div>
        <div className="hero-panel surface-soft">
          <strong>초기 MVP 범위</strong>
          <ul className="bullet-list tight">
            <li>WEBP ↔ JPG/PNG 변환</li>
            <li>이미지 압축 품질 조절</li>
            <li>가로/세로 리사이즈</li>
            <li>가이드/FAQ/정책 페이지 동시 운영</li>
          </ul>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading left-align narrow">
          <p className="eyebrow">왜 이 사이트를 쓰나</p>
          <h2>툴만 있는 페이지보다, 실제로 이해하면서 쓸 수 있게 만들고 있어요</h2>
        </div>
        <div className="card-grid three-up">
          {toolHighlights.map((item) => (
            <article key={item.title} className="surface-card info-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading left-align narrow">
          <p className="eyebrow">대표 가이드</p>
          <h2>검색해서 들어온 사람이 바로 읽을 수 있는 문서를 같이 쌓습니다</h2>
        </div>
        <div className="card-grid three-up">
          {guides.slice(0, 6).map((guide) => (
            <article key={guide.slug} className="surface-card guide-card">
              <p className="card-kicker">{guide.category}</p>
              <h3>{guide.title}</h3>
              <p>{guide.summary}</p>
              <div className="meta-row">
                <span>{guide.updated}</span>
                <span>{guide.readingTime}</span>
              </div>
              <button type="button" className="text-link-button" onClick={() => navigate(`/guides/${guide.slug}`)}>
                읽어보기
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )

  const renderToolPage = () => (
    <div className="page-stack">
      <header className="surface-card detail-header">
        <p className="eyebrow">Tool</p>
        <h1>이미지 변환 / 압축 도구</h1>
        <p>첫 MVP에서는 JPG, PNG, WEBP 위주로 실제 브라우저 내 변환을 지원합니다.</p>
      </header>

      <div className="tool-layout">
        <form className="surface-card tool-panel" onSubmit={handleSubmit}>
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
              <input type="range" min="0.4" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} />
              <small>{Math.round(quality * 100)}%</small>
            </label>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={resizeEnabled} onChange={(event) => setResizeEnabled(event.target.checked)} />
            <span>크기 조절도 같이 적용</span>
          </label>

          {resizeEnabled ? (
            <div className="field-grid">
              <label className="field">
                <span>가로(px)</span>
                <input value={resizeWidth} onChange={(event) => setResizeWidth(event.target.value)} inputMode="numeric" />
              </label>
              <label className="field">
                <span>세로(px)</span>
                <input value={resizeHeight} onChange={(event) => setResizeHeight(event.target.value)} inputMode="numeric" />
              </label>
            </div>
          ) : null}

          {error ? <p className="error-text">{error}</p> : null}

          <div className="button-row">
            <button type="submit" className="primary-button" disabled={!file || isProcessing}>
              {isProcessing ? '처리 중...' : mode === 'convert' ? '변환 시작' : '압축/리사이즈 시작'}
            </button>
          </div>
        </form>

        <aside className="surface-card side-panel">
          <h2>현재 파일 정보</h2>
          {originalInfo ? (
            <ul className="bullet-list tight">
              <li>크기: {originalInfo.width} × {originalInfo.height}px</li>
              <li>원본 용량: {originalInfo.sizeLabel}</li>
              <li>출력 형식: {mimeToLabel(targetFormat)}</li>
              <li>처리 모드: {mode === 'convert' ? '포맷 변환' : '압축/리사이즈'}</li>
            </ul>
          ) : (
            <p>파일을 올리면 여기서 크기와 용량을 바로 볼 수 있어요.</p>
          )}

          {result ? (
            <div className="result-box">
              <strong>처리 완료</strong>
              <p>출력 형식: {mimeToLabel(result.mimeType)}</p>
              <p>결과 용량: {result.sizeLabel}</p>
              <button type="button" className="secondary-button full-width" onClick={downloadResult}>
                {result.filename} 다운로드
              </button>
            </div>
          ) : null}
        </aside>
      </div>

      {previewUrl ? (
        <section className="surface-card preview-panel">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>현재 업로드 이미지</h2>
          </div>
          <img className="preview-image" src={previewUrl} alt="업로드한 미리보기" />
        </section>
      ) : null}
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
