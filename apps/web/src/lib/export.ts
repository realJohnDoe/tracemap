/** Core's SVG uses plain colors, so it already renders standalone outside the page. */
export function serializeSvg(svg: SVGSVGElement): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + svg.outerHTML
}

export function download(name: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function svgToPngBlob(svg: SVGSVGElement, source: string): Promise<Blob> {
  const w = svg.width.baseVal.value, h = svg.height.baseVal.value
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w * 2; c.height = h * 2
      const g = c.getContext('2d')!
      g.scale(2, 2); g.drawImage(img, 0, 0)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))))
    }
    img.onerror = () => reject(new Error('image load failed'))
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source)
  })
}
