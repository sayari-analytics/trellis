import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const rootDir = path.resolve(__dirname, '../../')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'd3-hierarchy/src/hierarchy',
        replacement: `${rootDir}/node_modules/d3-hierarchy/src/hierarchy`
      },
      {
        find: /^@trellis\/(.*)/,
        replacement: `${rootDir}/src/$1`
      }
    ]
  }
})
