import Stats from 'stats.js'
import { Grid } from './grid'
import { Renderer } from '.'

export class Debug {
  stats?: Stats
  renderNodes?: Stats.Panel
  renderEdges?: Stats.Panel
  renderPixi?: Stats.Panel
  renderApp?: Stats.Panel
  updateViewportPanel?: Stats.Panel
  updateNodeCountPanel?: Stats.Panel
  updateEdgeCountPanel?: Stats.Panel
  grid?: Grid

  constructor(
    private renderer: Renderer,
    debug: true | { stats?: boolean; grid?: boolean; gridText?: boolean }
  ) {
    if (debug === true || debug.stats === true) {
      this.stats = new Stats()
      this.stats.showPanel(0)
      this.renderNodes = new Stats.Panel('Node', '#222', '#fff')
      this.renderEdges = new Stats.Panel('Edge', '#222', '#fff')
      this.renderPixi = new Stats.Panel('Pixi', '#222', '#fff')
      this.renderApp = new Stats.Panel('App', '#222', '#fff')
      this.updateNodeCountPanel = new Stats.Panel('Node', '#fff', '#222')
      this.updateEdgeCountPanel = new Stats.Panel('Edge', '#fff', '#222')
      this.updateViewportPanel = new Stats.Panel('View', '#fff', '#222')

      // Render Time Display
      const renderTimeContainer = document.createElement('div')
      renderTimeContainer.style.position = 'relative'
      renderTimeContainer.style.maxWidth = '320px'

      const renderTimeHeader = document.createElement('h1')
      renderTimeHeader.textContent = 'Render Time'
      renderTimeHeader.style.font = 'bold 12px sans-serif'
      renderTimeHeader.style.padding = '4px 2px 2px'

      renderTimeContainer.appendChild(renderTimeHeader)
      renderTimeContainer.appendChild(this.renderNodes.dom)
      renderTimeContainer.appendChild(this.renderEdges.dom)
      renderTimeContainer.appendChild(this.renderPixi.dom)
      renderTimeContainer.appendChild(this.renderApp.dom)

      // Render Count Display
      const renderCountContainer = document.createElement('div')
      renderCountContainer.style.position = 'relative'
      renderCountContainer.style.maxWidth = '240px'

      const renderCountHeader = document.createElement('h1')
      renderCountHeader.textContent = 'Render Count'
      renderCountHeader.style.font = 'bold 12px sans-serif'
      renderCountHeader.style.padding = '4px 2px 2px'

      renderCountContainer.appendChild(renderCountHeader)
      renderCountContainer.appendChild(this.updateViewportPanel.dom)
      renderCountContainer.appendChild(this.updateNodeCountPanel.dom)
      renderCountContainer.appendChild(this.updateEdgeCountPanel.dom)

      // Stats Display
      const statsContainer = document.createElement('div')
      statsContainer.style.position = 'relative'
      statsContainer.style.maxWidth = '240px'

      const statsHeader = document.createElement('h1')
      statsHeader.textContent = 'Stats'
      statsHeader.style.font = 'bold 12px sans-serif'
      statsHeader.style.padding = '4px 2px 2px'

      this.stats.dom.style.position = 'relative'
      this.stats.dom.style.maxWidth = '80px'

      statsContainer.appendChild(statsHeader)
      statsContainer.appendChild(this.stats.dom)

      // Add All Displays to Body
      document.body.appendChild(renderTimeContainer)
      document.body.appendChild(renderCountContainer)
      document.body.appendChild(statsContainer)
    }

    if (debug === true || debug.grid === true) {
      this.grid = new Grid(this.renderer, 24000, 24000, 100, { text: typeof debug === 'object' && debug.gridText })
    }
  }
}
