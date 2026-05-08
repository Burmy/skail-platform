import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PREVIEW_TIMEOUT_MS = 4000

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const rawUrl = requestUrl.searchParams.get('url')
  const target = parsePreviewUrl(rawUrl)

  if (!target) {
    return NextResponse.json({ error: 'A valid http(s) URL is required.' }, { status: 400 })
  }

  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: 'This URL cannot be previewed.' }, { status: 400 })
  }

  const embed = getSafeEmbed(target)
  const fallback = {
    url: target.toString(),
    title: target.hostname.replace(/^www\./, ''),
    description: '',
    imageUrl: '',
    faviconUrl: defaultFavicon(target),
    siteName: target.hostname.replace(/^www\./, ''),
    embedUrl: embed?.embedUrl ?? '',
    provider: embed?.provider ?? '',
    canEmbed: Boolean(embed),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)

  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent':
          'SKAIL-LinkPreview/1.0 (+https://skail.app; server-side metadata fetch)',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('text/html')) {
      return NextResponse.json(fallback)
    }

    const html = (await response.text()).slice(0, 250_000)
    const title =
      getMeta(html, 'og:title') ||
      getMeta(html, 'twitter:title') ||
      getTitle(html) ||
      fallback.title
    const description =
      getMeta(html, 'og:description') ||
      getMeta(html, 'description') ||
      getMeta(html, 'twitter:description')
    const image =
      getMeta(html, 'og:image') ||
      getMeta(html, 'twitter:image') ||
      ''
    const favicon =
      getLinkRel(html, 'icon') ||
      getLinkRel(html, 'shortcut icon') ||
      getLinkRel(html, 'apple-touch-icon') ||
      fallback.faviconUrl
    const siteName = getMeta(html, 'og:site_name') || fallback.siteName

    return NextResponse.json({
      ...fallback,
      title: clean(title),
      description: clean(description),
      imageUrl: absolutize(image, target),
      faviconUrl: absolutize(favicon, target) || fallback.faviconUrl,
      siteName: clean(siteName),
    })
  } catch {
    return NextResponse.json(fallback)
  } finally {
    clearTimeout(timeout)
  }
}

function parsePreviewUrl(value: string | null) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
    return parsed
  } catch {
    return null
  }
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1'
  ) {
    return true
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return true
  }
  const private172 = host.match(/^172\.(\d+)\./)
  return private172 ? Number(private172[1]) >= 16 && Number(private172[1]) <= 31 : false
}

function getSafeEmbed(url: URL): { provider: string; embedUrl: string } | null {
  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id ? { provider: 'YouTube', embedUrl: `https://www.youtube.com/embed/${id}` } : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id =
      url.searchParams.get('v') ||
      url.pathname.match(/^\/(?:shorts|embed)\/([^/?#]+)/)?.[1]
    return id ? { provider: 'YouTube', embedUrl: `https://www.youtube.com/embed/${id}` } : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1]
    return id ? { provider: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${id}` } : null
  }

  if (host === 'loom.com' || host === 'www.loom.com') {
    const id = url.pathname.match(/\/(?:share|embed)\/([^/?#]+)/)?.[1]
    return id ? { provider: 'Loom', embedUrl: `https://www.loom.com/embed/${id}` } : null
  }

  if (host === 'figma.com') {
    return {
      provider: 'Figma',
      embedUrl: `https://www.figma.com/embed?embed_host=skail&url=${encodeURIComponent(url.toString())}`,
    }
  }

  if (host === 'docs.google.com') {
    return { provider: 'Google Docs', embedUrl: url.toString() }
  }

  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1]
    return id
      ? { provider: 'Google Drive', embedUrl: `https://drive.google.com/file/d/${id}/preview` }
      : null
  }

  return null
}

function getMeta(html: string, key: string) {
  const escaped = escapeRegex(key)
  const nameFirst = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    'i',
  )
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
    'i',
  )
  return decodeEntities(nameFirst.exec(html)?.[1] ?? contentFirst.exec(html)?.[1] ?? '')
}

function getTitle(html: string) {
  return decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
}

function getLinkRel(html: string, rel: string) {
  const escaped = escapeRegex(rel)
  const relFirst = new RegExp(
    `<link[^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]+href=["']([^"']*)["'][^>]*>`,
    'i',
  )
  const hrefFirst = new RegExp(
    `<link[^>]+href=["']([^"']*)["'][^>]+rel=["'][^"']*${escaped}[^"']*["'][^>]*>`,
    'i',
  )
  return decodeEntities(relFirst.exec(html)?.[1] ?? hrefFirst.exec(html)?.[1] ?? '')
}

function absolutize(value: string, base: URL) {
  if (!value) return ''
  try {
    return new URL(value, base).toString()
  } catch {
    return ''
  }
}

function defaultFavicon(url: URL) {
  return `${url.origin}/favicon.ico`
}

function clean(value: string) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim().slice(0, 500)
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
