import { useEffect } from 'react'

const SITE_ORIGIN = 'https://www.tabaco.id'

type SEOConfig = {
  title: string
  description: string
  image?: string
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    const [, key, val] = selector.match(/\[(.+?)="(.+?)"\]/) || []
    if (key && val) el.setAttribute(key, val)
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

// Single writer: pass null when another page already owns the title for this route.
export function useSEO(pathname: string, config: SEOConfig | null) {
  const title = config?.title
  const description = config?.description
  const image = config?.image

  useEffect(() => {
    if (!title || description == null) return

    const fullTitle = `${title} — TabacoID`
    const canonicalUrl = `${SITE_ORIGIN}${pathname === '/' ? '' : pathname}`
    const imageUrl = image ?? `${SITE_ORIGIN}/og-image.png`

    document.title = fullTitle

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:url"]', 'content', canonicalUrl)
    setMeta('meta[property="og:image"]', 'content', imageUrl)

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image')
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('meta[name="twitter:image"]', 'content', imageUrl)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [title, description, image, pathname])
}
