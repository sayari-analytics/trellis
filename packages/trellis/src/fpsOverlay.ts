const WIDTH = 140
const GRAPH_HEIGHT = 32
const HISTORY = 120
const TARGET_FPS = 60
const LABEL_INTERVAL_MS = 333

/**
 * Heads-up display that measures and graphs frame rate over time. It runs its own
 * requestAnimationFrame loop, reporting the page's real frame cadence without hooking into the
 * Renderer. Call `destroy()` to tear it down.
 */
export class FPSOverlay {
  private readonly element: HTMLDivElement
  private rafHandle: number

  constructor() {
    const samples = new Float32Array(HISTORY)
    let sampleHead = 0
    let sampleCount = 0
    let lastTime = 0
    let lastLabelTime = 0
    let smoothedFps = 0

    this.element = document.createElement('div')
    Object.assign(this.element.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: `${WIDTH}px`,
      padding: '6px 8px',
      background: 'rgba(0, 0, 0, 0.6)',
      borderRadius: '4px',
      color: '#fff',
      font: '11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace',
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: '2147483647'
    } satisfies Partial<CSSStyleDeclaration>)

    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(WIDTH * dpr)
    canvas.height = Math.round(GRAPH_HEIGHT * dpr)
    canvas.style.width = `${WIDTH}px`
    canvas.style.height = `${GRAPH_HEIGHT}px`
    canvas.style.marginTop = '4px'
    canvas.style.display = 'block'

    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('FPSOverlay: 2D canvas context is not available')
    ctx.scale(dpr, dpr)

    const labelNode = document.createTextNode('— FPS')
    this.element.appendChild(labelNode)
    this.element.appendChild(canvas)
    document.body.appendChild(this.element)

    const targetY = GRAPH_HEIGHT - (TARGET_FPS / (TARGET_FPS * 2)) * GRAPH_HEIGHT
    const barWidth = WIDTH / HISTORY

    const tick = (time: number) => {
      if (lastTime !== 0) {
        const delta = time - lastTime
        const fps = delta > 0 ? 1000 / delta : 0
        samples[sampleHead] = fps
        sampleHead = (sampleHead + 1) % HISTORY
        sampleCount = Math.min(sampleCount + 1, HISTORY)
        smoothedFps = smoothedFps === 0 ? fps : smoothedFps * 0.9 + fps * 0.1
      }
      lastTime = time

      ctx.clearRect(0, 0, WIDTH, GRAPH_HEIGHT)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, targetY)
      ctx.lineTo(WIDTH, targetY)
      ctx.stroke()

      // bars, oldest on the left. only reassign fillStyle when the color bucket changes
      let lastColor = ''
      for (let i = 0; i < sampleCount; i++) {
        const idx = (sampleHead - sampleCount + i + HISTORY) % HISTORY
        const fps = samples[idx]
        const barHeight = Math.min(fps / (TARGET_FPS * 2), 1) * GRAPH_HEIGHT
        const color = fps >= 55 ? '#5cd65c' : fps >= 30 ? '#f5d442' : '#f55442'
        if (color !== lastColor) {
          ctx.fillStyle = color
          lastColor = color
        }
        ctx.fillRect(i * barWidth, GRAPH_HEIGHT - barHeight, Math.max(barWidth, 1), barHeight)
      }

      if (time - lastLabelTime >= LABEL_INTERVAL_MS) {
        let min = Infinity
        for (let i = 0; i < sampleCount; i++) min = Math.min(min, samples[i])
        const minText = sampleCount > 0 ? Math.round(min) : 0
        labelNode.nodeValue = `${Math.round(smoothedFps)} FPS  (min ${minText})`
        lastLabelTime = time
      }

      this.rafHandle = requestAnimationFrame(tick)
    }
    this.rafHandle = requestAnimationFrame(tick)
  }

  destroy() {
    cancelAnimationFrame(this.rafHandle)
    this.element.remove()
  }
}
