/**
 * Minimal rooted-hierarchy data structure — the input the tidy-tree layout (./tree) operates on.
 *
 * Ported from d3-hierarchy/src/hierarchy (only the parts the tree layout actually uses) so this package
 * carries no runtime dependency. `hierarchy(data)` wraps a nested `{ children }` datum into a tree of
 * `HierarchyNode`s, each tagged with its `depth` (distance from the root) and `height` (distance to its
 * deepest leaf), and threaded with `parent`/`children` links. `eachBefore`/`eachAfter` walk the tree in
 * pre-/post-order (iteratively, so deep trees don't overflow the stack); `sort` orders each node's
 * children in place. The tidy-tree layout adds `x`/`y` to every node, yielding a `HierarchyPointNode`.
 */

export interface HierarchyNode<Datum> {
  data: Datum
  depth: number // number of hops from the root (root = 0)
  height: number // number of hops to the most distant leaf (leaf = 0)
  parent: HierarchyNode<Datum> | null
  children?: HierarchyNode<Datum>[]
  // pre-order (parent before children) / post-order (children before parent) traversals; return `this`
  eachBefore(callback: (node: HierarchyNode<Datum>) => void): this
  eachAfter(callback: (node: HierarchyNode<Datum>) => void): this
  // sort every node's children in place; comparator receives the child HierarchyNodes
  sort(compare: (a: HierarchyNode<Datum>, b: HierarchyNode<Datum>) => number): this
}

// a hierarchy node after the tree layout has assigned coordinates (parent/children are likewise positioned)
export interface HierarchyPointNode<Datum> extends HierarchyNode<Datum> {
  x: number
  y: number
  parent: HierarchyPointNode<Datum> | null
  children?: HierarchyPointNode<Datum>[]
}

class Node<Datum> implements HierarchyPointNode<Datum> {
  data: Datum
  depth = 0
  height = 0
  parent: Node<Datum> | null = null
  children?: Node<Datum>[]
  x = 0
  y = 0

  constructor(data: Datum) {
    this.data = data
  }

  eachBefore(callback: (node: Node<Datum>) => void): this {
    const nodes: Node<Datum>[] = [this]
    let node: Node<Datum> | undefined
    while ((node = nodes.pop())) {
      callback(node)
      const children = node.children
      if (children) for (let i = children.length - 1; i >= 0; --i) nodes.push(children[i])
    }
    return this
  }

  eachAfter(callback: (node: Node<Datum>) => void): this {
    const nodes: Node<Datum>[] = [this]
    const next: Node<Datum>[] = []
    let node: Node<Datum> | undefined
    while ((node = nodes.pop())) {
      next.push(node)
      const children = node.children
      if (children) for (let i = 0, n = children.length; i < n; ++i) nodes.push(children[i])
    }
    while ((node = next.pop())) callback(node)
    return this
  }

  sort(compare: (a: Node<Datum>, b: Node<Datum>) => number): this {
    return this.eachBefore((node) => {
      if (node.children) node.children.sort(compare)
    })
  }
}

// walk parent links upward, raising each ancestor's height until it already exceeds this branch
const computeHeight = <Datum>(node: Node<Datum>): void => {
  let height = 0
  let current: Node<Datum> | null = node
  do {
    current.height = height
  } while ((current = current.parent) && current.height < ++height)
}

/**
 * Build a hierarchy from a nested datum whose children are reached through `data.children`. Returns the
 * root `HierarchyNode`, with `depth`/`height` populated on every node.
 */
export const hierarchy = <Datum extends { children?: Datum[] }>(data: Datum): HierarchyNode<Datum> => {
  const root = new Node(data)
  const nodes: Node<Datum>[] = [root]
  let node: Node<Datum> | undefined
  while ((node = nodes.pop())) {
    const childData = node.data.children
    if (childData !== undefined && childData.length > 0) {
      node.children = new Array<Node<Datum>>(childData.length)
      for (let i = childData.length - 1; i >= 0; --i) {
        const child = new Node(childData[i])
        child.parent = node
        child.depth = node.depth + 1
        node.children[i] = child
        nodes.push(child)
      }
    }
  }
  return root.eachBefore(computeHeight)
}
