/* eslint-disable no-console */
import * as Graph from '../..'


export const logUnknownEdgeError = (source: Graph.Node | undefined, target: Graph.Node | undefined) => {
  if (source === undefined && target === undefined) {
    console.error(`Error: Cannot render edge between unknown nodes ${source} and ${target}`)
  } else if (source === undefined) {
    console.error(`Error: Cannot render edge from unknown node ${source}`)
  } else if (target === undefined) {
    console.error(`Error: Cannot render edge to unknown node ${target}`)
  }
}
