import { createElement, FunctionComponent, useCallback, useState } from 'react'


export type Props = {
  selected?: boolean
  disabled?: boolean
  group?: 'top' | 'middle' | 'bottom'
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
  marginLeft: '12px',
  marginBottom: '12px',
}

const HOVER_STYLE = {
  background: '#eee',
}

const FOCUS_STYLE = {
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const SELECTED_STYLE = {
  background: '#ccc',
  color: '#222',
}

const SELECTED_HOVER_FOCUS_STYLE = {
  background: '#eee',
  color: '#222',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const SELECTED_HOVER_STYLE = {
  background: '#eee',
  color: '#222',
}

const SELECTED_FOCUS_STYLE = {
  background: '#ccc',
  color: '#222',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const HOVER_FOCUS_STYLE = {
  background: '#eee',
  boxShadow: '0px 0px 0px 1px #aaa inset',
}

const DISABLED_STYLE = {
  background: '#eee',
  color: '#aaa',
}


// TODO - memoize style computation
const buttonStyle = (disabled?: boolean, selected?: boolean, hover?: boolean, focus?: boolean, group?: 'top' | 'middle' | 'bottom') => {
  const _STYLE = group === undefined ? (
    STYLE
  ) : group === 'top' ? {
    ...STYLE,
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    marginBottom: '0',
    borderBottom: '0',
  } : group === 'middle' ? {
    ...STYLE,
    borderRadius: '0',
    marginBottom: '0',
    borderBottom: '0',
  } : {
    ...STYLE,
    borderTopLeftRadius: '0',
    borderTopRightRadius: '0',
  }

  return disabled ? (
    { ..._STYLE, ...DISABLED_STYLE }
  ) : selected && hover && focus ? (
    { ..._STYLE, ...SELECTED_HOVER_FOCUS_STYLE }
  ) : selected && hover ? (
    { ..._STYLE, ...SELECTED_HOVER_STYLE }
  ) : selected && focus ? (
    { ..._STYLE, ...SELECTED_FOCUS_STYLE }
  ) : hover && focus ? (
    { ..._STYLE, ...HOVER_FOCUS_STYLE }
  ) : selected ? (
    { ..._STYLE, ...SELECTED_STYLE }
  ) : hover ? (
    { ..._STYLE, ...HOVER_STYLE }
  ) : focus ? (
    { ..._STYLE, ...FOCUS_STYLE}
  ) : _STYLE
}


export const Button: FunctionComponent<Props> = (props) => {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)

  const onMouseEnter = useCallback(() => setHover(true), [])
  const onMouseLeave = useCallback(() => setHover(false), [])
  const onFocus = useCallback(() => setFocus(true), [])
  const onBlur = useCallback(() => setFocus(false), [])

  return createElement('button', {
    style: buttonStyle(props.disabled, props.selected, hover, focus, props.group),
    'aria-label': props.title,
    title: props.title,
    onClick: props.onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  }, props.children)
}
