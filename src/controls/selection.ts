import * as PIXI from 'pixi.js'


const DEFAULT_TOP = '100px'
const DEFAULT_LEFT = '20px'
const DEFAULT_BG = '#fff'
const DEFAULT_BG_HOVER = '#eee'
const DEFAULT_BG_SELECTED = '#ccc'
const DEFAULT_BG_HOVER_SELECTED = '#ccc'
// const DEFAULT_DISABLED = '#eee'
const DEFAULT_COLOR = '#666'
// const DEFAULT_COLOR_HOVER = '#666'
const DEFAULT_COLOR_SELECTED = '#222'
// const DEFAULT_COLOR_HOVER_SELECTED = '#222'
// const DEFAULT_DISABLED = '#aaa'


export type Options = Partial<{
  className: string
  top: number
  left: number
  right: number
  bottom: number
  onSelection: (event: PIXI.InteractionEvent, x: number, y: number) => void // TODO - (event: PIXI.InteractionEvent, x: number, y: number, selected: string[], annotation: Circle) => void
  onContainerPointerDown: (event: PIXI.InteractionEvent, x: number, y: number) => void
  onContainerDrag: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => void
  onContainerPointerUp: (event: PIXI.InteractionEvent, x: number, y: number) => void
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


export const Control = ({ container }: { container: HTMLDivElement }) => {
  let selected = false
  let selectionStartX: number | undefined
  let selectionStartY: number | undefined

  const controlContainer = document.createElement('div')
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'

  const toggleSelection = styleButton(document.createElement('button'))
  toggleSelection.textContent = '●'
  toggleSelection.setAttribute('aria-label', 'Select')
  toggleSelection.setAttribute('title', 'Select')
  toggleSelection.onmouseenter = () => toggleSelection.style.background = selected ? DEFAULT_BG_HOVER_SELECTED : DEFAULT_BG_HOVER
  toggleSelection.onmouseleave = () => toggleSelection.style.background = selected ? DEFAULT_BG_SELECTED : DEFAULT_BG
  toggleSelection.onfocus = () => toggleSelection.style.boxShadow = '0px 0px 0px 1px #aaa inset'
  toggleSelection.onblur = () => toggleSelection.style.boxShadow = 'none'
  toggleSelection.onpointerdown = () => {
    if (selected) {
      toggleSelection.style.background = DEFAULT_BG
      toggleSelection.style.color = DEFAULT_COLOR
      selected = false
      selectionStartX = undefined
      selectionStartY = undefined
    } else {
      toggleSelection.style.background = DEFAULT_BG_SELECTED
      toggleSelection.style.color = DEFAULT_COLOR_SELECTED
      selected = true
    }
  }
  controlContainer.appendChild(toggleSelection)

  container.style.position = 'relative'
  container.appendChild(controlContainer)

  return (options: Options) => {
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
      onContainerPointerDown: (event: PIXI.InteractionEvent, x: number, y: number) => {
        if (selected) {
          container.style.cursor = 'copy'
          selectionStartX = x
          selectionStartY = y
        } else {
          container.style.cursor = 'move'
        }

        options.onContainerPointerDown?.(event, x, y)
      },
      onContainerDrag: (event: PIXI.InteractionEvent | undefined, x: number, y: number) => {
        if (selected && selectionStartX !== undefined && selectionStartY !== undefined && event) {
          console.log(`x0: ${selectionStartX.toFixed(2)} y0: ${selectionStartY.toFixed(2)} x1: ${x.toFixed(2)} y1: ${y.toFixed(2)} radius: ${Math.hypot(x - selectionStartX, y - selectionStartY).toFixed(2)}`)
          /**
           * TODO -
           * - calculate selected nodes
           * - inject circle annotation
           */
          options.onSelection?.(event, x, y)
        } else {
          options.onContainerDrag?.(event, x, y)
        }
      },
      onContainerPointerUp: (event: PIXI.InteractionEvent, x: number, y: number) => {
        container.style.cursor = 'auto'
        options.onContainerPointerUp?.(event, x, y)
      },
    }
  }
}
