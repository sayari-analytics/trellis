import { createNodeIndex } from '../../src/layout/hierarchy/utils'
import { Node } from '../../src/trellis'
import data from '../lib/nodes'

describe('[Layout - Hierarchy]', () => {
  const nodes: Node[] = data.slice(0, 10).map((node) => {
    const start = node.id * 100
    return {
      ...node,
      id: String(node.id),
      subgraph: {
        edges: [],
        nodes: data.slice(start, start + 10).map((n) => ({ ...n, id: String(n.id) }))
      }
    }
  })

  const lookup = createNodeIndex(nodes)

  describe('createNodeIndex', () => {
    it('should create a lookup table of nodes', () => {
      const ids = nodes.map((node) => String(node.id))
      ids.forEach((id) => {
        expect(lookup).toHaveProperty(id)
      })
    })

    it('should index subgraph nodes', () => {
      expect(lookup).toHaveProperty('101')
      expect(lookup).toHaveProperty('201')
      expect(lookup).toHaveProperty('301')
      expect(lookup).toHaveProperty('401')
    })
  })
})
