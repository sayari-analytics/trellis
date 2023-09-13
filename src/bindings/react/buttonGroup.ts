import { createElement, Fragment, FunctionComponent, ReactNode } from 'react'
import { Button } from './button'

export type Props = {
  children: {
    selected?: boolean
    disabled?: boolean
    title?: string
    onClick?: () => void
    body: ReactNode
  }[]
}

export const ButtonGroup: FunctionComponent<Props> = (props) => {
  return createElement(
    Fragment,
    {},
    props.children.map(({ selected, disabled, title, onClick, body }, idx) =>
      createElement(
        Button,
        {
          key: idx,
          group:
            props.children.length === 0
              ? undefined
              : idx === 0
              ? 'top'
              : idx === props.children.length - 1
              ? 'bottom'
              : 'middle',
          selected,
          disabled,
          title,
          onClick,
        },
        body,
      ),
    ),
  )
}
