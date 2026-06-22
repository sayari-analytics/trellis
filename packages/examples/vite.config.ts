import { defineConfig } from 'vite'
import path from 'path'

// In dev, resolve workspace packages directly to source.
export default defineConfig({
  resolve: {
    alias: {
      '@sayari/trellis-controls/zoom': path.resolve(__dirname, '../controls/src/zoom.ts'),
      '@sayari/trellis-controls/selection': path.resolve(__dirname, '../controls/src/selection.ts'),
      '@sayari/trellis-controls/download': path.resolve(__dirname, '../controls/src/download.ts'),
      '@sayari/trellis-controls': path.resolve(__dirname, '../controls/src/index.ts'),
      '@sayari/trellis-hierarchy': path.resolve(__dirname, '../hierarchy/src/index.ts'),
      '@sayari/trellis-sugiyama': path.resolve(__dirname, '../sugiyama/src/index.ts'),
      '@sayari/trellis-utils': path.resolve(__dirname, '../utils/src/index.ts'),
      '@sayari/trellis-force': path.resolve(__dirname, '../force/src/index.ts'),
      '@sayari/trellis-quadtree': path.resolve(__dirname, '../quadtree/src/index.ts'),
      '@sayari/trellis': path.resolve(__dirname, '../trellis/src/index.ts')
    }
  }
})
