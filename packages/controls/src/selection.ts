export type Options = Partial<{
  className: string
  top: number
  left: number
  right: number
  bottom: number
  onChange: (selecting: boolean) => void
}>

const SELECT_LABEL = 'Select'

const DEFAULT_TOP = '20px'
const DEFAULT_LEFT = '20px'

const BG = '#fff'
const BG_HOVER = '#eee'
const BG_ACTIVE = '#ddd'
const BG_ACTIVE_HOVER = '#ccc'
const COLOR = '#666'
const COLOR_ACTIVE = '#222'

const styleButton = (button: HTMLButtonElement) => {
  button.type = 'button'
  button.style.border = '1px solid #aaa'
  button.style.borderRadius = '4px'
  button.style.background = BG
  button.style.cursor = 'pointer'
  button.style.width = '30px'
  button.style.height = '30px'
  button.style.display = 'block'
  button.style.padding = '0'
  button.style.outline = 'none'
  button.style.boxSizing = 'border-box'
  button.style.fontWeight = 'bold'
  button.style.color = COLOR

  return button
}

export const Control = ({ container }: { container: HTMLDivElement }) => {
  let toggled = false
  let shiftHeld = false
  let hovered = false
  let last = false
  let onChange: ((selecting: boolean) => void) | undefined

  const selecting = () => toggled || shiftHeld

  const controlContainer = document.createElement('div')
  controlContainer.style.position = 'absolute'
  controlContainer.style.display = 'none'
  controlContainer.setAttribute('role', 'group')
  controlContainer.setAttribute('aria-label', SELECT_LABEL)

  const button = styleButton(document.createElement('button'))
  button.textContent = '⬚'
  button.setAttribute('aria-label', SELECT_LABEL)
  button.setAttribute('aria-pressed', 'false')
  button.setAttribute('title', SELECT_LABEL)
  controlContainer.appendChild(button)

  const paint = () => {
    const active = selecting()
    button.style.background = active ? (hovered ? BG_ACTIVE_HOVER : BG_ACTIVE) : hovered ? BG_HOVER : BG
    button.style.color = active ? COLOR_ACTIVE : COLOR
    button.setAttribute('aria-pressed', String(active))
  }

  const emit = () => {
    const next = selecting()
    if (next === last) return
    last = next
    onChange?.(next)
  }

  button.onmouseenter = () => {
    hovered = true
    paint()
  }
  button.onmouseleave = () => {
    hovered = false
    paint()
  }
  button.onfocus = () => (button.style.boxShadow = '0px 0px 0px 1px #aaa inset')
  button.onblur = () => (button.style.boxShadow = 'none')
  button.onclick = () => {
    toggled = !toggled
    paint()
    emit()
  }

  // Shift is a momentary selection shortcut; ignore key repeats.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Shift' || shiftHeld) return
    shiftHeld = true
    paint()
    emit()
  }
  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== 'Shift') return
    shiftHeld = false
    paint()
    emit()
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  container.style.position = 'relative'
  container.appendChild(controlContainer)

  const configure = (options: Options) => {
    controlContainer.style.display = 'block'
    controlContainer.className = options.className ?? 'selection-container'

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

    onChange = options.onChange
  }

  return Object.assign(configure, {
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      controlContainer.remove()
    }
  })
}
