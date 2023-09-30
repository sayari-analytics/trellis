import * as Cluster from './layout/cluster'
import * as Force from './layout/force'
import * as Hierarchy from './layout/hierarchy'
import * as Collide from './layout/collide'
import * as Components from './layout/components'
import * as Fisheye from './layout/fisheye'
import * as WebGL from './renderers/webgl'
import * as ReactWebGLBindings from './bindings/react/renderer'
import * as ReactSelectionBindings from './bindings/react/selection'
import * as ReactZoomBindings from './bindings/react/zoom'
import * as NativeDownloadBindings from './bindings/native/download'
import * as NativeSelectionBindings from './bindings/native/selection'
import * as NativeZoomBindings from './bindings/native/zoom'
import * as Image from './renderers/image'
import * as utils from '.'

(window as any).trellis = {
  layout: { Cluster, Force, Hierarchy, Fisheye, Collide, Components },
  renderers: { WebGL, Image },
  bindings: {
    react: {
      Renderer: ReactWebGLBindings,
      Selection: ReactSelectionBindings,
      Zoom: ReactZoomBindings
    },
    native: {
      Download: NativeDownloadBindings,
      Selection: NativeSelectionBindings,
      Zoom: NativeZoomBindings
    }
  },
  utils
}
