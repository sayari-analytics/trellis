import { createElement, FunctionComponent, useCallback, useState } from 'react'


export type Props = {
  selected?: boolean
  disabled?: boolean
  title?: string
  onClick?: () => void
}


const STYLE = {
  border: '1px solid #aaa',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  width: '30px',
  height: '30px',
  display: 'block',
  padding: 0,
  outline: 'none',
  boxSizing: 'border-box',
  fontWeight: 'bold',
  color: '#666',
}

const HOVER_STYLE = {
  ...STYLE,
  background: '#eee',
}

const FOCUS_STYLE = {
  ...STYLE,
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const SELECTED_STYLE = {
  ...STYLE,
  background: '#ccc',
  color: '#222',
}

const SELECTED_HOVER_FOCUS_STYLE = {
  ...STYLE,
  background: '#eee',
  color: '#222',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const SELECTED_HOVER_STYLE = {
  ...STYLE,
  background: '#eee',
  color: '#222',
}

const SELECTED_FOCUS_STYLE = {
  ...STYLE,
  background: '#ccc',
  color: '#222',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const HOVER_FOCUS_STYLE = {
  ...STYLE,
  background: '#eee',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const DISABLED_STYLE = {
  ...STYLE,
  background: '#eee',
  color: '#aaa',
}


export const Button: FunctionComponent<Props> = (props) => {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)

  const onMouseEnter = useCallback(() => setHover(true), [])
  const onMouseLeave = useCallback(() => setHover(false), [])
  const onFocus = useCallback(() => setFocus(true), [])
  const onBlur = useCallback(() => setFocus(false), [])

  return createElement('button', {
    style: props.disabled ? (
      DISABLED_STYLE
    ) : props.selected && hover && focus ? (
      SELECTED_HOVER_FOCUS_STYLE
    ) : props.selected && hover ? (
      SELECTED_HOVER_STYLE
    ) : props.selected && focus ? (
      SELECTED_FOCUS_STYLE
    ) : hover && focus ? (
      HOVER_FOCUS_STYLE
    ) : props.selected ? (
      SELECTED_STYLE
    ) : hover ? (
      HOVER_STYLE
    ) : focus ? (
      FOCUS_STYLE
    ) : STYLE,
    'aria-label': props.title,
    title: props.title,
    onClick: props.onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  }, props.children)
}
