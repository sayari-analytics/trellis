/**
 * DOM control widgets for a trellis graph: small, self-contained overlays that render their own buttons into
 * a container element and fire callbacks on interaction (zoom in/out, selection toggle, image download).
 *
 * Each control shares the same `Control` factory / `Options` names, so they're re-exported here under a
 * namespace (`Zoom.Control`, `Selection.Control`, `Download.Control`). They're also available as subpath
 * imports — `import { Control } from '@sayari/trellis-controls/zoom'` — when only one is needed.
 */

export * as Zoom from './zoom'
export * as Selection from './selection'
export * as Download from './download'
