import { createElement, FunctionComponent } from 'react'
import ButtonGroup from './buttonGroup'

export type Props = {
  onZoomIn?: () => void
  onZoomOut?: () => void
}

// TODO - memoize, disable on min/max zoom
const Zoom: FunctionComponent<Props> = (props) => {
  return createElement(ButtonGroup, {
    children: [
      {
        body: '＋',
        title: 'Zoom In',
        onClick: props.onZoomIn
      },
      {
        body: '－',
        title: 'Zoom Out',
        onClick: props.onZoomOut
      }
    ]
  })
}

export default Zoom
