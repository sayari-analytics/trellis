import { NodeStrokes } from './objects/nodeStrokes'
import { LineSegment } from './objects/lineSegment'
import { Arrow } from './objects/arrow'
import ObjectManager from './objects/ObjectManager'
import Circle from './objects/circle/Circle'
import Icon from './objects/Icon'
import Text from './objects/text/Text'

export default class LifecycleManager {
  nodes = new ObjectManager<NodeStrokes | Circle>(2000)
  icons = new ObjectManager<Icon>(1000)
  edges = new ObjectManager<LineSegment>(2000)
  arrows = new ObjectManager<Arrow>(1000)
  labels = new ObjectManager<Text>(2000)
  interactions = new ObjectManager(2000)
  // interactions = new ObjectManager<HitArea>(2000) // TODO

  render() {
    this.nodes.render()
    this.icons.render()
    this.edges.render()
    this.arrows.render()
    this.labels.render()
    this.interactions.render()
  }
}
