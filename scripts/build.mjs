// Shared package build: esbuild for JS (ESM, code-split, deps externalized), tsc for declarations.
//
// Run from a package directory, passing its entry source files:
//   node ../../scripts/build.mjs index.ts [worker.ts ...]
//
// - esbuild bundles each entry to dist/ as ESM with sourcemaps, splitting shared internal modules into
//   chunks, and externalizing every bare import (so @sayari/* and any real deps stay external).
// - tsc -p tsconfig.build.json emits .d.ts (+ .d.ts.map) alongside.
// - any hand-authored *.d.ts in the package source (e.g. hierarchy/tree) is copied into dist, since tsc
//   does not re-emit existing declaration files.

import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { cpSync, rmSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const entries = process.argv.slice(2)
if (entries.length === 0) {
  console.error('build.mjs: no entry files given')
  process.exit(1)
}

const cwd = process.cwd()
const outdir = join(cwd, 'dist')

rmSync(outdir, { recursive: true, force: true })

// 1. JS via esbuild
await build({
  entryPoints: entries,
  outdir,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  packages: 'external', // leave every bare import (deps, @sayari/*) as an external import
  logLevel: 'warning'
})

// 2. Declarations via tsc (emitDeclarationOnly is set in tsconfig.base.json)
execFileSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit', cwd })

// 3. Copy hand-authored .d.ts files (tsc only emits declarations for .ts sources, not existing .d.ts)
const findHandwrittenDts = (dir) => {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findHandwrittenDts(full))
    else if (entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}
for (const dts of findHandwrittenDts(cwd)) {
  const rel = relative(cwd, dts)
  const outRel = rel.startsWith('src/') ? rel.slice(4) : rel
  cpSync(dts, join(outdir, outRel))
}
