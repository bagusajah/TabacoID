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

export function useSEO(pathname: string, config: SEOConfig) {
  const fullTitle = `${config.title} — TabacoID`
  const canonicalUrl = `${SITE_ORIGIN}${pathname === '/' ? '' : pathname}`
  const imageUrl = config.image ?? `${SITE_ORIGIN}/tabacoid-logo.svg`

  useEffect(() => {
    document.title = fullTitle

    setMeta('meta[name="description"]', 'content', config.description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', config.description)
    setMeta('meta[property="og:url"]', 'content', canonicalUrl)
    setMeta('meta[property="og:image"]', 'content', imageUrl)

    setMeta('meta[name="twitter:card"]', 'content', 'summary')
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', config.description)
    setMeta('meta[name="twitter:image"]', 'content', imageUrl)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [fullTitle, config.description, canonicalUrl, imageUrl])
}
