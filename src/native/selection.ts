import { ViewportDragDecelerateEvent, ViewportDragEvent, ViewportPointerEvent } from './../webgl'

const DEFAULT_TOP = '100px'
const DEFAULT_LEFT = '20px'
const DEFAULT_BG = '#fff'
const DEFAULT_BG_HOVER = '#eee'
const DEFAULT_BG_SELECTED = '#ccc'
const DEFAULT_BG_HOVER_SELECTED = '#ccc'
const DEFAULT_COLOR = '#666'
const DEFAULT_COLOR_SELECTED = '#222'

export type SelectionChangeEvent = { type: 'selectionChange'; x: number; y: number; radius: number }

export type SelectionOptions = Partial<{
  className: string
  top: number
  left: number
  right: number
  bottom: number
  onSelection: (event: SelectionChangeEvent) => void
  onViewportPointerDown: (event: ViewportPointerEvent) => void
  onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  onViewportPointerUp: (event: ViewportPointerEvent) => void
}>

const styleButton = (button: HTMLButtonElement) => {
  button.style.border = '1px solid #aaa'
  button.style.borderRadius = '4px'
  button.style.background = DEFAULT_BG
  button.style.cursor = 'pointer'
  button.style.width = '30px'
  button.style.height = '30px'
  button.style.display = 'block'
  button.style.padding = '0'
  button.style.outline = 'none'
  button.style.boxSizing = 'border-box'
  button.style.fontWeight = 'bold'
  button.style.color = DEFAULT_COLOR

  return button
}

export const Selection = {
  Control: ({ container }: { container: HTMLDivElement }) => {
    let select = false
    let selectionStartX: number | undefined
    let selectionStartY: number | undefined

    const controlContainer = document.createElement('div')
    controlContainer.style.position = 'absolute'
    controlContainer.style.display = 'none'

    const toggleSelection = styleButton(document.createElement('button'))
    toggleSelection.textContent = '●'
    toggleSelection.setAttribute('aria-label', 'Select')
    toggleSelection.setAttribute('title', 'Select')
    toggleSelection.onmouseenter = () => (toggleSelection.style.background = select ? DEFAULT_BG_HOVER_SELECTED : DEFAULT_BG_HOVER)
    toggleSelection.onmouseleave = () => (toggleSelection.style.background = select ? DEFAULT_BG_SELECTED : DEFAULT_BG)
    toggleSelection.onfocus = () => (toggleSelection.style.boxShadow = '0px 0px 0px 1px #aaa inset')
    toggleSelection.onblur = () => (toggleSelection.style.boxShadow = 'none')
    const toggleButtonPointerDown = () => {
      if (select) {
        select = false
        selectionStartX = undefined
        selectionStartY = undefined
        toggleSelection.style.background = DEFAULT_BG
        toggleSelection.style.color = DEFAULT_COLOR
      } else {
        select = true
        toggleSelection.style.background = DEFAULT_BG_SELECTED
        toggleSelection.style.color = DEFAULT_COLOR_SELECTED
      }
    }
    toggleSelection.onpointerdown = toggleButtonPointerDown
    controlContainer.appendChild(toggleSelection)

    container.style.position = 'relative'
    container.appendChild(controlContainer)

    return (options: SelectionOptions) => {
      controlContainer.style.display = 'block'
      controlContainer.className = options.className ?? 'selection-container'

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

      return {
        onViewportPointerDown: (event: ViewportPointerEvent) => {
          if (select) {
            container.style.cursor = 'copy'
            selectionStartX = event.x
            selectionStartY = event.y
          } else {
            container.style.cursor = 'move'
          }

          options.onViewportPointerDown?.(event)
        },
        onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
          if (select && selectionStartX !== undefined && selectionStartY !== undefined && event.type === 'viewportDrag') {
            options.onSelection?.({
              type: 'selectionChange',
              x: selectionStartX,
              y: selectionStartY,
              radius: Math.hypot(event.x - selectionStartX, event.y - selectionStartY)
            })
          } else {
            options.onViewportDrag?.(event)
          }
        },
        onViewportPointerUp: (event: ViewportPointerEvent) => {
          container.style.cursor = 'auto'
          if (select) {
            toggleButtonPointerDown()
          }
          options.onViewportPointerUp?.(event)
        }
      }
    }
  }
}

export default Selection
