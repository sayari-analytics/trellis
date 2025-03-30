import Stats from 'stats.js'
import { IComponent } from '.'
import { Grid } from './grid'
import { Renderer } from '..'

export class Debug implements IComponent {
  stats?: Stats
  renderNodes?: Stats.Panel
  renderEdges?: Stats.Panel
  renderEvents?: Stats.Panel
  renderPixi?: Stats.Panel
  renderApp?: Stats.Panel
  updateViewportPanel?: Stats.Panel
  updateNodeCountPanel?: Stats.Panel
  updateEdgeCountPanel?: Stats.Panel
  grid?: Grid
  viewportChanged = false
  nodeUpdateCount = 0
  edgeUpdateCount = 0

  private renderTimeContainer?: HTMLDivElement
  private updatedContainer?: HTMLDivElement
  private statsContainer?: HTMLDivElement

  constructor(
    private renderer: Renderer,
    debug: true | { stats?: boolean; grid?: boolean; gridText?: boolean }
  ) {
    if (debug === true || debug.stats === true) {
      this.stats = new Stats()
      this.stats.showPanel(0)
      this.renderNodes = new Stats.Panel('Node', '#222', '#fff')
      this.renderEdges = new Stats.Panel('Edge', '#222', '#fff')
      this.renderEvents = new Stats.Panel('Events', '#222', '#fff')
      this.renderPixi = new Stats.Panel('Pixi', '#222', '#fff')
      this.renderApp = new Stats.Panel('App', '#222', '#fff')
      this.updateNodeCountPanel = new Stats.Panel('Node', '#fff', '#222')
      this.updateEdgeCountPanel = new Stats.Panel('Edge', '#fff', '#222')
      this.updateViewportPanel = new Stats.Panel('View', '#fff', '#222')

      // Render Time Display
      this.renderTimeContainer = document.createElement('div')
      this.renderTimeContainer.style.position = 'absolute'
      this.renderTimeContainer.style.top = '0px'
      this.renderTimeContainer.style.left = '0px'
      this.renderTimeContainer.style.maxWidth = '400px'

      const renderTimeHeader = document.createElement('h1')
      renderTimeHeader.textContent = 'Render Time'
      renderTimeHeader.style.font = 'bold 12px sans-serif'
      renderTimeHeader.style.padding = '4px 2px 2px'

      this.renderTimeContainer.appendChild(renderTimeHeader)
      this.renderTimeContainer.appendChild(this.renderNodes.dom)
      this.renderTimeContainer.appendChild(this.renderEdges.dom)
      this.renderTimeContainer.appendChild(this.renderEvents.dom)
      this.renderTimeContainer.appendChild(this.renderPixi.dom)
      this.renderTimeContainer.appendChild(this.renderApp.dom)

      // Updated Components Display
      this.updatedContainer = document.createElement('div')
      this.updatedContainer.style.position = 'absolute'
      this.updatedContainer.style.top = '64px'
      this.updatedContainer.style.left = '0px'
      this.updatedContainer.style.maxWidth = '240px'

      const updatedHeader = document.createElement('h1')
      updatedHeader.textContent = 'Updated Component'
      updatedHeader.style.font = 'bold 12px sans-serif'
      updatedHeader.style.padding = '4px 2px 2px'

      this.updatedContainer.appendChild(updatedHeader)
      this.updatedContainer.appendChild(this.updateViewportPanel.dom)
      this.updatedContainer.appendChild(this.updateNodeCountPanel.dom)
      this.updatedContainer.appendChild(this.updateEdgeCountPanel.dom)

      // Stats Display
      this.statsContainer = document.createElement('div')
      this.statsContainer.style.position = 'absolute'
      this.statsContainer.style.top = '148px'
      this.statsContainer.style.left = '0px'
      this.statsContainer.style.maxWidth = '240px'

      this.stats.dom.style.position = 'absolute'
      this.stats.dom.style.top = '0px'
      this.stats.dom.style.left = '0px'
      this.stats.dom.style.maxWidth = '80px'

      this.statsContainer.appendChild(this.stats.dom)

      // Add All Displays to Body
      document.body.appendChild(this.renderTimeContainer)
      document.body.appendChild(this.updatedContainer)
      document.body.appendChild(this.statsContainer)
    }

    if (debug === true || debug.grid === true) {
      this.grid = new Grid(this.renderer, 24000, 24000, 100, { text: typeof debug === 'object' && debug.gridText })
    }
  }

  render() {
    this.stats?.update()
    this.updateViewportPanel?.update(this.viewportChanged ? 1 : 0, 1)
    this.updateNodeCountPanel?.update(this.nodeUpdateCount, this.renderer.components.nodes.nodes.length)
    this.updateEdgeCountPanel?.update(this.edgeUpdateCount, this.renderer.components.edges.edges.length)
    this.viewportChanged = false
    this.nodeUpdateCount = 0
    this.edgeUpdateCount = 0

    return this
  }

  delete() {
    if (this.renderTimeContainer) document.body.removeChild(this.renderTimeContainer)
    if (this.updatedContainer) document.body.removeChild(this.updatedContainer)
    if (this.statsContainer) document.body.removeChild(this.statsContainer)
  }
}
