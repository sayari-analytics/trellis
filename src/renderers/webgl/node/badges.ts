import { Stroke } from '../../../types'
import { NodeIcon } from './icon'

export type NodeBadge = {
  position: number
  radius: number
  color: string
  icon?: NodeIcon
  stroke?: Stroke
}
