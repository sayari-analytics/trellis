import { createElement, FunctionComponent, useState, useCallback, useEffect, Fragment, useMemo } from 'react'
import { render } from 'react-dom'
import ReactResizeDetector from 'react-resize-detector'
import Stats from 'stats.js'
import { Selection, SelectionChangeEvent } from '../../src/bindings/react/selection'
import { Button } from '../../src/bindings/react/button'
import { Renderer } from '../../src/bindings/react/renderer'
import { clampZoom, Zoom } from '../../src/bindings/react/zoom'
import * as Graph from '../../src'
import * as Force from '../../src/layout/force'
import * as Cluster from '../../src/layout/cluster'
import * as Fisheye from '../../src/layout/fisheye'
import * as WebGL from '../../src/renderers/webgl'
import graphData from '../../data/tmp-data'


const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const force = Force.Layout()
const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.5

/**
 * Render React Layout and Renderer Components
 */
const App: FunctionComponent = () => {

  const [graph, setGraph] = useState<{ annotations: Graph.Annotation[], x: number, y: number, zoom: number, selected: Set<string>, hoverNode?: string, hoverEdge?: string }>({
    annotations: [{
      type: 'text',
      id: 'test-annotation',
      width: 100,
      height: 100,
      x: 10,
      y: 10,
      resize: true,
      content: 'This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text. This is a test of long text.',
      boxStyle: {
        color: '#FFFFFF',
        stroke: {
          color: '#000000',
          width: 2
        }
      }
    }],
    x: 0,
    y: 0,
    zoom: 1,
    selected: new Set(),
  })


  const onZoomIn = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom / 0.6) }))
  }, [])
  const onZoomOut = useCallback(() => {
    setGraph((graph) => ({ ...graph, zoom: clampZoom(MIN_ZOOM, MAX_ZOOM, graph.zoom * 0.6) }))
  }, [])

  const onAnnotationDrag = useCallback(({ annotationX, annotationY, target: { id, x = 0, y = 0 } }: WebGL.AnnotationDragEvent) => {
    const dx = annotationX - x
    const dy = annotationY - y

    setGraph((graph) => ({
      ...graph,
      annotations: graph.annotations.map((annotation) => (
        annotation.id === id ? (
          { ...annotation, x: annotationX, y: annotationY }
        ) : annotation
      ))
    }))
  }, [])
  
  const onViewportPointerUp = useCallback(() => {
    setGraph((graph) => ({
      ...graph,
      selected: new Set(),
    }))
  }, [])
  const onViewportDrag = useCallback(({ viewportX: x, viewportY: y }: WebGL.ViewportDragEvent | WebGL.ViewportDragDecelerateEvent) => {
    setGraph((graph) => ({ ...graph, x, y }))
  }, [])
  const onViewportWheel = useCallback(({ viewportX: x, viewportY: y, viewportZoom: zoom }: WebGL.ViewportWheelEvent) => {
    setGraph((graph) => ({ ...graph, x, y, zoom }))
  }, [])
  const onSelection = useCallback(({ selection, shiftKey, metaKey }: SelectionChangeEvent) => {
    setGraph((graph) => ({ ...graph, selected: shiftKey || metaKey ? new Set([...graph.selected, ...selection]) : selection }))
  }, [])


  return (
    createElement(ReactResizeDetector, {},
      ({ width, height }: { width?: number, height?: number }) => (
        createElement('div', { style: { width: '100%', height: '100%' } }, (
          createElement(Selection, {
            nodes: [],
            onViewportDrag,
            onSelection,
            children: ({ select, toggleSelect, annotation, cursor, onViewportDragStart, onViewportDrag, onViewportDragEnd }) => (
              createElement(Fragment, {},
                createElement('div', { style: { position: 'absolute', top: 72, left: 12 } },
                  createElement(Button, { title: 'Select Tool', selected: select, onClick: toggleSelect }, '■'),
                  createElement(Zoom, { onZoomIn, onZoomOut })
                ),
                createElement(Renderer, {
                  width,
                  height,
                  nodes: [],
                  edges: [],
                  annotations: graph.annotations,
                  x: graph.x,
                  y: graph.y,
                  zoom: graph.zoom,
                  minZoom: MIN_ZOOM,
                  maxZoom: MAX_ZOOM,
                  cursor,
                  onViewportDragStart,
                  onViewportDrag,
                  onViewportDragEnd,
                  onViewportPointerUp,
                  onViewportWheel,
                  onAnnotationDrag,
                  debug: { stats }
                })
              )
            )
          })
        ))
      )
    )
  )
}


render(
  createElement(App),
  document.querySelector('#graph')
)