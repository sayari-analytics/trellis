import { TreeLayout as HierarchyTreeLayout } from 'd3-hierarchy'

interface TreeLayout<Datum> extends HierarchyTreeLayout<Datum> {
  alignment: (alignment: 'min' | 'max' | 'mid') => this
}
export default function <Datum>(): TreeLayout<Datum>
