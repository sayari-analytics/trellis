export type Options = {
  className?: string
  top?: number
  left?: number
  right?: number
  bottom?: number
  fileName?: string
  onClick?: () => Promise<string>
}


const DEFAULT_TOP = '20px'
const DEFAULT_LEFT = '20px'
const DEFAULT_BG = '#fff'
const DEFAULT_BG_HOVER = '#eee'
// const DEFAULT_DISABLED = '#eee'
const DEFAULT_COLOR = '#666'
// const DEFAULT_COLOR_HOVER = '#666'
// const DEFAULT_COLOR_HOVER_SELECTED = '#222'
// const DEFAULT_DISABLED = '#aaa'


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
  const controlContainer = document.createElement('div')
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'

  const download = styleButton(document.createElement('button'))
  download.textContent = 'd'
  download.setAttribute('aria-label', 'Download')
  download.setAttribute('title', 'Download')
  download.onmouseenter = () => DEFAULT_BG_HOVER
  download.onmouseleave = () => DEFAULT_BG
  download.onfocus = () => download.style.boxShadow = '0px 0px 0px 1px #aaa inset'
  download.onblur = () => download.style.boxShadow = 'none'
  download.onpointerdown = () => {
    download.style.background = DEFAULT_BG
    download.style.color = DEFAULT_COLOR
  }
  controlContainer.appendChild(download)

  container.style.position = 'relative'
  container.appendChild(controlContainer)


  return (options: Options) => {
    controlContainer.style.display = 'block'
    controlContainer.className = options.className ?? 'download-container'

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

    download.onclick = () => {
      options.onClick?.()?.then((url: string) => {
        const link = document.createElement('a')
        link.setAttribute('download', options.fileName ?? 'download.png')
        link.href = url
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
    }
  }
}
