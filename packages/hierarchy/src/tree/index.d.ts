import type { HierarchyNode, HierarchyPointNode } from '../hierarchy'

type Separation<Datum> = (a: HierarchyNode<Datum>, b: HierarchyNode<Datum>) => number

// Reingold–Tilford "tidy" tree layout (Buchheim et al.). Assigns x/y to every node of a hierarchy.
interface TreeLayout<Datum> {
  (root: HierarchyNode<Datum>): HierarchyPointNode<Datum>
  size(): [number, number] | null
  size(size: [number, number]): this
  nodeSize(): [number, number] | null
  nodeSize(size: [number, number]): this
  separation(): Separation<Datum>
  separation(separation: Separation<Datum>): this
  alignment(alignment: 'min' | 'max' | 'mid'): this
}

export default function <Datum>(): TreeLayout<Datum>
