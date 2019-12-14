import { NodeStyle, EdgeStyle } from './options'
import { PositionedNode, PositionedEdge } from '..'
import { Viewport } from 'pixi-viewport'
import { throttleAnimationFrame, throttle, batch } from '../utils'


export const nodeStyleSelector = <T extends keyof NodeStyle>(nodeStyles: NodeStyle, attribute: T) => (node: PositionedNode): NodeStyle[T] => {
  if (node.style === undefined || node.style![attribute] === undefined) {
    return nodeStyles[attribute]
  }

  return node.style[attribute] as NodeStyle[T]
}

export const edgeStyleSelector = <T extends keyof EdgeStyle>(edgeStyles: EdgeStyle, attribute: T) => (edge: PositionedEdge): EdgeStyle[T] => {
  if (edge.style === undefined || edge.style![attribute] === undefined) {
    return edgeStyles[attribute]
  }

  return edge.style[attribute] as NodeStyle[T]
}

export const pixiFrameRate = (viewport: Viewport) => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  el.style.position = 'absolute'
  el.style.top = '8px'
  el.style.left = '8px'
  el.style.padding = '4px 12px'
  el.style.fontFamily = 'monospace'
  el.style.fontSize = '14px'
  el.style.fontWeight = '600'
  el.style.background = 'white'
  el.style.border = '1px solid #eee'
  el.style.borderRadius = '2px'
  
  const render = batch<number>((rates: number[]) => {
    const avg = rates.reduce((a, b) => a + b) / rates.length

    if (avg > 30) {
      el.style.backgroundColor = '#98ee80'
      el.style.borderColor = '#009800'
      el.style.color = '#009800'
    } else if (avg > 20) {
      el.style.backgroundColor = '#ffe17c'
      el.style.borderColor = '#f0a200'
      el.style.color = '#f0a200'
    } else {
      el.style.backgroundColor = '#ffaba6'
      el.style.borderColor = '#d62d21'
      el.style.color = '#d62d21'
    }

    el.innerText = avg.toFixed(1)
  }, 500)

  let t1 = Date.now()
  viewport.on('frame-end' as any, () => {
    const t2 = Date.now()
    const rate = 1.0 / ((t2 - t1) * .001)
    render(rate)
    t1 = t2
  })
}

