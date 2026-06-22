export type Options = Partial<{
  className: string
  top: number
  left: number
  right: number
  bottom: number
  fileName: string
  onDownload: (event: MouseEvent) => Promise<Blob> | Blob
}>

const DOWNLOAD_LABEL = 'Download'

const DEFAULT_TOP = '20px'
const DEFAULT_LEFT = '20px'

const styleButton = (button: HTMLButtonElement) => {
  button.type = 'button'
  button.style.border = '1px solid #aaa'
  button.style.borderRadius = '4px'
  button.style.background = '#fff'
  button.style.cursor = 'pointer'
  button.style.width = '30px'
  button.style.height = '30px'
  button.style.display = 'block'
  button.style.padding = '0'
  button.style.outline = 'none'
  button.style.boxSizing = 'border-box'
  button.style.fontWeight = 'bold'
  button.style.color = '#666'
  button.onmouseenter = () => (button.style.background = '#eee')
  button.onmouseleave = () => (button.style.background = '#fff')
  button.onfocus = () => (button.style.boxShadow = '0px 0px 0px 1px #aaa inset')
  button.onblur = () => (button.style.boxShadow = 'none')

  return button
}

export const Control = ({ container }: { container: HTMLDivElement }) => {
  const controlContainer = document.createElement('div')
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'

  const download = styleButton(document.createElement('button'))
  download.setAttribute('aria-label', DOWNLOAD_LABEL)
  download.setAttribute('title', DOWNLOAD_LABEL)
  download.textContent = '↓'
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

    download.onclick = async (event) => {
      if (options.onDownload === undefined) return
      const blob = await options.onDownload(event)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('download', options.fileName ?? 'download')
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }
}
