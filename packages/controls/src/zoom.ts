export type Options = Partial<{
  className: string
  top: number
  left: number
  right: number
  bottom: number
  // MouseEvent also covers keyboard-triggered clicks.
  onZoomIn: (event: MouseEvent) => void
  onZoomOut: (event: MouseEvent) => void
}>

const ZOOM_IN_LABEL = 'Zoom in'
const ZOOM_OUT_LABEL = 'Zoom out'

const DEFAULT_TOP = '20px'
const DEFAULT_LEFT = '20px'

const styleButton = (button: HTMLButtonElement) => {
  button.type = 'button'
  button.style.border = '1px solid #aaa'
  button.style.background = '#fff'
  button.style.cursor = 'pointer'
  button.style.width = '30px'
  button.style.height = '30px'
  button.style.display = 'block'
  button.style.padding = '0'
  button.style.outline = 'none'
  button.style.boxSizing = 'border-box'
  button.style.fontWeight = 'bold'
  button.style.color = '#666'
  button.onmouseenter = () => (button.style.background = '#eee')
  button.onmouseleave = () => (button.style.background = '#fff')
  button.onfocus = () => (button.style.boxShadow = '0px 0px 0px 1px #aaa inset')
  button.onblur = () => (button.style.boxShadow = 'none')

  return button
}

export const clampZoom = (min: number, max: number, zoom: number) => Math.max(min, Math.min(max, zoom))

export const Control = ({ container }: { container: HTMLDivElement }) => {
  const controlContainer = document.createElement('div')
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'
  controlContainer.setAttribute('role', 'group')
  controlContainer.setAttribute('aria-label', 'Zoom')

  const zoomIn = styleButton(document.createElement('button'))
  zoomIn.setAttribute('aria-label', ZOOM_IN_LABEL)
  zoomIn.setAttribute('title', ZOOM_IN_LABEL)
  zoomIn.textContent = '＋'
  zoomIn.style.borderTopLeftRadius = '4px'
  zoomIn.style.borderTopRightRadius = '4px'
  controlContainer.appendChild(zoomIn)

  const zoomOut = styleButton(document.createElement('button'))
  zoomOut.setAttribute('aria-label', ZOOM_OUT_LABEL)
  zoomOut.setAttribute('title', ZOOM_OUT_LABEL)
  zoomOut.textContent = '－'
  zoomOut.style.borderTop = 'none'
  zoomOut.style.borderBottomLeftRadius = '4px'
  zoomOut.style.borderBottomRightRadius = '4px'
  controlContainer.appendChild(zoomOut)

  container.style.position = 'relative'
  container.appendChild(controlContainer)

  return (options: Options) => {
    controlContainer.style.display = 'block'
    controlContainer.className = options.className ?? 'zoom-container'

    if (options.top !== undefined) {
      controlContainer.style.top = `${options.top}px`
    } else if (options.bottom !== undefined) {
      controlContainer.style.bottom = `${options.bottom}px`
    } else {
      controlContainer.style.top = DEFAULT_TOP
    }

    if (options.left !== undefined) {
      controlContainer.style.left = `${options.left}px`
    } else if (options.right !== undefined) {
      controlContainer.style.right = `${options.right}px`
    } else {
      controlContainer.style.left = DEFAULT_LEFT
    }

    zoomIn.onclick = options.onZoomIn ?? null
    zoomOut.onclick = options.onZoomOut ?? null
  }
}
