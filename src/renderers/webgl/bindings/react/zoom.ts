import { createElement, FunctionComponent } from 'react'
import { ButtonGroup } from './buttonGroup'


export { clampZoom } from '../../../../controls/zoom'


export type Props = {
  onZoomIn?: () => void
  onZoomOut?: () => void
}


// TODO - memoize, disable on min/max zoom
export const Zoom: FunctionComponent<Props> = (props) => {

  return (
    createElement(ButtonGroup, {
      children: [{
        body: '＋',
        title: 'Zoom In',
        onClick: props.onZoomIn
      }, {
        body: '－',
        title: 'Zoom Out',
        onClick: props.onZoomOut
      }]
    })
  )
}
