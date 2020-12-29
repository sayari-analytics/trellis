import * as Graph from '../'
import { Options as RendererOptions, ViewportDragDecelerateEvent, ViewportDragEvent, ViewportPointerEvent } from '../renderers/webgl'


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
  onSelection: (event: ViewportDragEvent) => void // TODO - (event: ViewportDragEvent, selected: Node[]) => void
  // onViewportPointerDown: (event: ViewportPointerEvent) => void
  // onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => void
  // onViewportPointerUp: (event: ViewportPointerEvent) => void
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


export const Control = ({ container, render }: {
  container: HTMLDivElement,
  render: (graph: { nodes: Graph.Node[], edges: Graph.Edge[], options?: RendererOptions, annotations?: Graph.Annotation[] }) => void
}) => {
  let selected = false
  let selectionStartX: number | undefined
  let selectionStartY: number | undefined
  let selectionAnnotation: Graph.Annotation | undefined

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
  const toggleSelectionControlButton = () => {
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
  toggleSelection.onpointerdown = toggleSelectionControlButton
  controlContainer.appendChild(toggleSelection)

  container.style.position = 'relative'
  container.appendChild(controlContainer)


  // TODO - combine options and controlOptions? in the very least, need to add onSelection to options
  return <N extends Graph.Node, E extends Graph.Edge>({ controlOptions = {}, ...graph }: { nodes: N[], edges: E[], options?: RendererOptions<N, E>, annotations?: Graph.Annotation[], controlOptions?: Options }) => {
    controlContainer.style.display = 'block'
    controlContainer.className = controlOptions.className ?? 'selection-container'

    if (controlOptions.top !== undefined) {
      controlContainer.style.top = `${controlOptions.top}px`
    } else if (controlOptions.bottom !== undefined) {
      controlContainer.style.bottom = `${controlOptions.bottom}px`
    } else {
      controlContainer.style.top = DEFAULT_TOP
    }

    if (controlOptions.left !== undefined) {
      controlContainer.style.left = `${controlOptions.left}px`
    } else if (controlOptions.right !== undefined) {
      controlContainer.style.right = `${controlOptions.right}px`
    } else {
      controlContainer.style.left = DEFAULT_LEFT
    }

    /**
     * TODO - is it possible to initialize this once in the containing closure?
     */
    const options: RendererOptions<N, E> = {
      ...graph.options,
      onViewportPointerDown: (event: ViewportPointerEvent) => {
        if (selected) {
          selectionStartX = event.x
          selectionStartY = event.y
          container.style.cursor = 'copy'
        } else {
          container.style.cursor = 'move'
        }

        graph.options?.onViewportPointerDown?.(event) // should these always fire, or just when not selected? state changes initiated by ViewportPointerUp/Down probably shouldn't trigger on a selection start/end
      },
      onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
        if (selected) {
          if (event.type === 'viewportDrag') {
            // TODO - define style via controlOptions
            selectionAnnotation = {
              type: 'circle',
              id: 'selection',
              x: selectionStartX!,
              y: selectionStartY!,
              radius: Math.hypot(event.x - selectionStartX!, event.y - selectionStartY!),
              style: {
                color: '#eee',
                stroke: {
                  width: 2,
                  color: '#ccc'
                }
              }
            }

            // controlOptions.onSelection?.(nodes.filter(within(selectionStartX, selectionStartY, r)))
            controlOptions.onSelection?.(event)
          }
        } else {
          graph.options?.onViewportDrag?.(event)
        }
      },
      onViewportPointerUp: (event: ViewportPointerEvent) => {
        container.style.cursor = 'auto'

        if (selected) {
          toggleSelectionControlButton()
          selectionAnnotation = undefined
        }

        graph.options?.onViewportPointerUp?.(event) // should these always fire, or just when not selected? state changes initiated by ViewportPointerUp/Down probably shouldn't trigger on a selection start/end
      },
    }

    ;(render as unknown as (graph: { nodes: N[], edges: E[], options?: RendererOptions<N, E>, annotations?: Graph.Annotation[] }) => void)({
      nodes: graph.nodes,
      edges: graph.edges,
      options,
      annotations: selectionAnnotation === undefined ? graph.annotations : [...graph.annotations ?? [], selectionAnnotation],
    })
  }

  // return (options: Options) => {
  //   controlContainer.style.display = 'block'
  //   controlContainer.className = options.className ?? 'selection-container'

  //   if (options.top !== undefined) {
  //     controlContainer.style.top = `${options.top}px`
  //   } else if (options.bottom !== undefined) {
  //     controlContainer.style.bottom = `${options.bottom}px`
  //   } else {
  //     controlContainer.style.top = DEFAULT_TOP
  //   }

  //   if (options.left !== undefined) {
  //     controlContainer.style.left = `${options.left}px`
  //   } else if (options.right !== undefined) {
  //     controlContainer.style.right = `${options.right}px`
  //   } else {
  //     controlContainer.style.left = DEFAULT_LEFT
  //   }

  //   return {
  //     onViewportPointerDown: (event: ViewportPointerEvent) => {
  //       if (selected) {
  //         container.style.cursor = 'copy'
  //         selectionStartX = event.x
  //         selectionStartY = event.y
  //       } else {
  //         container.style.cursor = 'move'
  //       }

  //       options.onViewportPointerDown?.(event)
  //     },
  //     onViewportDrag: (event: ViewportDragEvent | ViewportDragDecelerateEvent) => {
  //       if (selected && selectionStartX !== undefined && selectionStartY !== undefined && event.type === 'viewportDrag') {
  //         /**
  //          * TODO -
  //          * - calculate selected nodes
  //          * - inject circle annotation
  //          */
  //         options.onSelection?.(event)
  //       } else {
  //         options.onViewportDrag?.(event)
  //       }
  //     },
  //     onViewportPointerUp: (event: ViewportPointerEvent) => {
  //       container.style.cursor = 'auto'
  //       options.onViewportPointerUp?.(event)
  //     },
  //   }
  // }
}
