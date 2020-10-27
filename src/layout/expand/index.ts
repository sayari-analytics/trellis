import { Node, Edge } from '../../'


export const subgraphRadius = <E extends Edge>(node: Node<E>, nodes: Node<E>[]) => {
  let _radius = node.radius

  for (const node of nodes) {
    const newRadius = Math.hypot(node.x ?? 0, node.y ?? 0) + node.radius
    _radius = Math.max(_radius, newRadius)
  }

  return _radius
}


export const Layout = () => {
  // return <N extends Node<E>, E extends Edge>(previousNodes: N[], nextNodes: N[]) => {
  //   let result: Node<E>[] = [],
  //     collapseNode: Node<E>,
  //     collapseNodeX: number,
  //     collapseNodeY: number,
  //     expandNode: Node<E>,
  //     expandNodeX: number,
  //     expandNodeY: number,
  //     node: Node<E>,
  //     theta: number,
  //     radius: number,
  //     nodeX: number,
  //     nodeY: number,
  //     xOffset: number,
  //     yOffset: number

  //   /**
  //    * collapse all existing subgraphs
  //    */
  //   for (let i = previousNodes.length - 1; i >= 0; i--) {
  //     if (previousNodes[i].subgraph !== undefined) {
  //       collapseNode = previousNodes[i]
  //       collapseNodeX = collapseNode.x ?? 0
  //       collapseNodeY = collapseNode.y ?? 0

  //       for (let j = 0; j < nextNodes.length; j++) {
  //         node = nextNodes[j]
  //         nodeX = node.x ?? 0
  //         nodeY = node.y ?? 0

  //         if (node.id !== collapseNode.id) {
  //           theta = Math.atan2(collapseNodeY - nodeY, collapseNodeX - nodeX)
  //           xOffset = Math.cos(theta) * collapseNode.radius
  //           yOffset = Math.sin(theta) * collapseNode.radius
  //           result.push({ ...node, x: nodeX + xOffset, y: nodeY + yOffset })
  //         } else {
  //           result.push(node)
  //         }
  //       }
  //     }
  //   }

  //   /**
  //    * expand all new subgraphs
  //    */
  //   for (let i = 0; i < result.length; i++) {
  //     if (result[i].subgraph !== undefined) {
  //       expandNode = previousNodes[i]
  //       expandNodeX = expandNode.x ?? 0
  //       expandNodeY = expandNode.y ?? 0
  //       radius = subgraphRadius(expandNode, expandNode.subgraph!.nodes)

  //       for (let j = 0; j < result.length; j++) {
  //         node = result[j]
  //         nodeX = node.x ?? 0
  //         nodeY = node.y ?? 0

  //         if (node.id !== expandNode.id) {
  //           theta = Math.atan2(nodeY - expandNodeY, nodeX - expandNodeX)
  //           xOffset = Math.cos(theta) * radius
  //           yOffset = Math.sin(theta) * radius
  //           node.x = nodeX + xOffset
  //           node.y = nodeY + yOffset
  //         }
  //       }
  //     }
  //   }
  // }

  return {
    expand: <N extends Node<E>, E extends Edge>(expandNode: N, nodes: N[]) => {
      let result: Node<E>[] = [],
        node: Node<E>,
        nodeX: number,
        nodeY: number,
        theta: number

      for (let i = 0; i < nodes.length; i++) {
        node = nodes[i]
        nodeX = node.x ?? 0
        nodeY = node.y ?? 0
        if (node.id === expandNode.id) {
          result.push({ ...node })
        } else {
          theta = Math.atan2(nodeY - (expandNode.y ?? 0), nodeX - (expandNode.x ?? 0))
          // node.x = nodeX + (Math.cos(theta) * expandNode.radius)
          // node.y = nodeY + (Math.sin(theta) * expandNode.radius)
          result.push({ ...node, x: nodeX + (Math.cos(theta) * expandNode.radius), y: nodeY + (Math.sin(theta) * expandNode.radius) })
        }
      }

      return result
      // return nodes
    },
    collapse: <N extends Node<E>, E extends Edge>(collapseNode: N, nodes: N[]) => {
      let result: Node<E>[] = [],
        node: Node<E>,
        nodeX: number,
        nodeY: number,
        theta: number

      for (let i = 0; i < nodes.length; i++) {
        node = nodes[i]
        nodeX = node.x ?? 0
        nodeY = node.y ?? 0
        if (node.id === collapseNode.id) {
          result.push({ ...node })
        } else {
          theta = Math.atan2((collapseNode.y ?? 0) - nodeY, (collapseNode.x ?? 0) - nodeX)
          // node.x = nodeX + (Math.cos(theta) * collapseNode.radius)
          // node.y = nodeY + (Math.sin(theta) * collapseNode.radius)
          result.push({ ...node, x: nodeX + (Math.cos(theta) * collapseNode.radius), y: nodeY + (Math.sin(theta) * collapseNode.radius) })
        }
      }

      return result
      // return nodes
    }
  }
}
