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
      style: {
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


  const onAnnotationDrag = useCallback(({ annotationX, annotationY, target: { id, x = 0, y = 0 } }: WebGL.AnnotationDragEvent) => {
    const dx = annotationX - x
    const dy = annotationY - y


    setGraph((graph) => ({
      ...graph,
      annotations: graph.annotations.map((annotation) => (
        annotation.id === id ? (
          { ...annotation, x: annotation.x + dx, y: annotation.y + dy }
        ) : annotation
      ))
    }))
  }, [])

  const onAnnotationResize = useCallback(({ width, height, target: { id, x = 0, y = 0 } }: WebGL.AnnotationResizeEvent) => {
    setGraph((graph) => ({
      ...graph,
      annotations: graph.annotations.map((annotation) => (
        annotation.id === id && annotation.type === 'text' ? (
          { ...annotation, width, height }
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


  return (
    createElement(ReactResizeDetector, {},
      ({ width, height }: { width?: number, height?: number }) => (
        createElement('div', { style: { width: '100%', height: '100%' } }, (
          createElement(Renderer, {
            width,
            height,
            nodes: [],
            edges: [],
            annotations: graph.annotations,
            x: graph.x,
            y: graph.y,
            onViewportDrag,
            onViewportPointerUp,
            onViewportWheel,
            onAnnotationDrag,
            onAnnotationResize,
            debug: { stats }
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