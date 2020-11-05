import { createElement, FunctionComponent, useEffect, useRef } from 'react'
import { Control, Options } from '../../../../controls/zoom'


export { clampZoom, fit, zoomTo } from '../../../../controls/zoom'

export type Props = Partial<Options>


export const Zoom: FunctionComponent<Props> = (props) => {

  const ref = useRef<HTMLDivElement>(null)
  const control = useRef<(options: Partial<Options>) => void>()

  useEffect(() => {
    control.current = Control({ container: ref.current! })
  }, [])

  useEffect(() => {
    control.current!(props)
  }, [props])

  return (
    createElement('div', { ref }, props.children)
  )
}


// export const Zoom = forwardRef<HTMLDivElement, Props>((props, ref) => {

//   // const ref = useRef<HTMLDivElement>(null)
//   const control = useRef<(options: Partial<Options>) => void>()

//   useEffect(() => {
//     control.current = Control({ container: ref.current! })
//   }, [ref?.current])

//   useEffect(() => {
//     control.current!(props)
//   }, [props])

//   return (
//     createElement('div', { ref })
//   )
// })