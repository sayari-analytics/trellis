import { InternalRenderer } from '.'

export class Debug {

  renderer: InternalRenderer
  container: HTMLDivElement
  text: HTMLSpanElement
  t: number

  constructor(renderer: InternalRenderer<any, any>) {
    this.renderer = renderer

    this.container = document.createElement('div')

    this.container.style.position = 'absolute'
    this.container.style.left = '0px'
    this.container.style.top = '0px'
    this.container.style.width = '80px'
    this.container.style.height = '28px'
    this.container.style.backgroundColor = 'black'
    this.container.style.padding = '0px 6px'

    this.text = document.createElement('span')
    this.text.style.color = 'white'
    this.text.style.fontFamily = 'monospace'
    this.text.style.fontSize = '12px'

    this.container.appendChild(this.text)
    document.body.appendChild(this.container)

    this.t = performance.now()
  }

  render = () => {
    this.text.textContent = `${(performance.now() - this.t).toFixed(0)}ms`
    this.t = performance.now()
  }
}
