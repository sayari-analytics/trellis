import { Node } from '../'


export type Options = {
  top: number,
  left: number
  right: number
  bottom: number
  // min: number
  // max: number
  onZoomIn: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null
  onZoomOut: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null
}

export type ViewportChangeOptions = {
  padding: number
}


const DEFAULT_TOP = '20px'
const DEFAULT_LEFT = '20px'
// const DEFAULT_MIN = 0.2
// const DEFAULT_MAX = 2.5


const styleButton = (button: HTMLButtonElement) => {
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
  button.onmouseenter = () => button.style.background = '#eee'
  button.onmouseleave = () => button.style.background = '#fff'
  button.onfocus = () => button.style.boxShadow = '0px 0px 0px 1px #aaa inset'
  button.onblur = () => button.style.boxShadow = 'none'

  return button
}


export const zoomTo = (nodes: Node[], options?: Partial<ViewportChangeOptions>) => {
  const result = {
    zoom: 1,
    position: [0, 0]
  }

  for (const node of nodes) {

  }

  return result
}

export const fit = (zoom: number, position: [number, number], nodes: Node[], options?: Partial<ViewportChangeOptions>) => {
  const result = {
    zoom: 1,
    position: [0, 0]
  }

  for (const node of nodes) {

  }

  return result
}

export const clampZoom = (min: number, max: number, zoom: number) => Math.max(min, Math.min(max, zoom))


export const Control = (options: { container: HTMLDivElement }) => {
  options.container.style.position = 'relative'
  const controlContainer = document.createElement('div')
  const zoomIn = styleButton(document.createElement('button'))
  const zoomOut = styleButton(document.createElement('button'))
  controlContainer.className = 'zoom-container'
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'
  controlContainer.appendChild(zoomIn)
  controlContainer.appendChild(zoomOut)
  options.container.appendChild(controlContainer)

  return (options: Partial<Options>) => {
    controlContainer.style.display = 'block'

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

    zoomIn.setAttribute('aria-label', 'Zoom in')
    zoomIn.textContent = '＋'
    zoomIn.style.borderTopLeftRadius = '4px'
    zoomIn.style.borderTopRightRadius = '4px'
    zoomIn.onclick = options.onZoomIn ?? null
    zoomOut.setAttribute('aria-label', 'Zoom out')
    zoomOut.style.borderTop = 'none'
    zoomOut.style.borderBottomLeftRadius = '4px'
    zoomOut.style.borderBottomRightRadius = '4px'
    zoomOut.textContent = '－'
    zoomOut.onclick = options.onZoomOut ?? null
  }
}
