import LineSegment from './objects/line/LineSegment'
import LineStrokes from './objects/line/LineStrokes'
import ObjectManager from './objects/ObjectManager'
import CircleStrokes from './objects/circle/CircleStrokes'
import Circle from './objects/circle/Circle'
import Arrow from './objects/Arrow'
import Icon from './objects/Icon'
import Text from './objects/text/Text'
import RectangleStrokes from './objects/rectangle/RectangleStrokes'
import Rectangle from './objects/rectangle/Rectangle'

export default class LifecycleManager {
  nodes = new ObjectManager<Circle | CircleStrokes>(2000)
  edges = new ObjectManager<LineSegment | LineStrokes>(2000)
  icons = new ObjectManager<Icon>(1000)
  arrows = new ObjectManager<Arrow>(1000)
  labels = new ObjectManager<Text>(2000)
  interactions = new ObjectManager(2000)
  annotations = new ObjectManager<Rectangle | RectangleStrokes | Circle | CircleStrokes | LineSegment | LineStrokes>(2000)
  text = new ObjectManager<Text>(1000)
  // interactions = new ObjectManager<HitArea>(2000) // TODO

  render() {
    this.nodes.render()
    this.icons.render()
    this.edges.render()
    this.arrows.render()
    this.labels.render()
    this.interactions.render()
    this.annotations.render()
    this.text.render()
  }
}
