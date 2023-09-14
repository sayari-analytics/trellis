import { TreeLayout as HierarchyTreeLayout } from 'd3-hierarchy'
import { Hierarchy } from '../utils'

interface TreeLayout<Datum> extends HierarchyTreeLayout<Datum> {
  alignment: (alignment: 'min' | 'max' | 'mid') => this
}
export default function <Datum = Hierarchy>(): TreeLayout<Datum>
