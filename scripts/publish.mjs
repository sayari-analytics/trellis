// Workspace-aware publish for the trellis packages.
//
//   node scripts/publish.mjs <patch|minor|major|rc | x.y.z[-rc.N]> [--dry-run] [--tag <dist-tag>]
//
// All packages version in lockstep: every workspace package.json is set to the same new version, and every
// internal @sayari/trellis* cross-dependency is pinned to that exact version (no floating "*"). Then the
// packages are built (npm run build:packages) and published in dependency order. Prereleases (a version with
// a "-") publish under the "next" dist-tag unless --tag overrides; stable releases publish under "latest".
//
// --dry-run computes and prints the plan and runs `npm publish --dry-run` (pack preview) without writing any
// files or publishing. Private workspaces (examples) are never published.
//
// Git is intentionally left alone (this repo is mid-migration with untracked packages); commit the version
// bump and tag the release yourself afterward.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

// publish in dependency order (leaves first); only packages that exist and aren't private are published
const PUBLISH_ORDER = [
  '@sayari/trellis-quadtree',
  '@sayari/trellis',
  '@sayari/trellis-force',
  '@sayari/trellis-sugiyama',
  '@sayari/trellis-hierarchy',
  '@sayari/trellis-utils',
  '@sayari/trellis-controls'
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const tagFlagIndex = args.indexOf('--tag')
const tagOverride = tagFlagIndex !== -1 ? args[tagFlagIndex + 1] : undefined
const bump = args.find((a) => !a.startsWith('--') && a !== tagOverride)

if (!bump) {
  console.error('usage: node scripts/publish.mjs <patch|minor|major|rc | x.y.z[-rc.N]> [--dry-run] [--tag <dist-tag>]')
  process.exit(1)
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/

const bumpVersion = (current, type) => {
  if (VERSION_RE.test(type)) return type // explicit target version
  const match = current.match(VERSION_RE)
  if (!match) throw new Error(`can't parse version "${current}" (expected x.y.z or x.y.z-rc.N)`)
  const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const rc = match[4] === undefined ? undefined : Number(match[4])
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
      return `${major}.${minor}.${patch + 1}`
    case 'rc':
    case 'prerelease':
      return rc !== undefined ? `${major}.${minor}.${patch}-rc.${rc + 1}` : `${major}.${minor}.${patch + 1}-rc.0`
    default:
      throw new Error(`unknown bump "${type}" (use patch | minor | major | rc | an explicit version)`)
  }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// read every workspace package
const workspaces = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dir = join(packagesDir, entry.name)
    const path = join(dir, 'package.json')
    const raw = readFileSync(path, 'utf8')
    return { dir, path, raw, json: JSON.parse(raw) }
  })

const workspaceNames = new Set(workspaces.map((w) => w.json.name))
const currentVersion = workspaces.find((w) => w.json.name === '@sayari/trellis').json.version
const newVersion = bumpVersion(currentVersion, bump)
const distTag = tagOverride ?? (newVersion.includes('-') ? 'next' : 'latest')
const rootPackagePath = join(root, 'package.json')
const rootPackageRaw = readFileSync(rootPackagePath, 'utf8')

console.log(`\ntrellis publish`)
console.log(`  ${currentVersion} -> ${newVersion}  (dist-tag: ${distTag})${dryRun ? '  [dry run]' : ''}\n`)

// 1. write the new version + pin internal cross-deps, via targeted text replacement (preserves formatting)
let rootPackageText = rootPackageRaw.replace(/("version":\s*)"[^"]*"/, `$1"${newVersion}"`)
if (rootPackageText !== rootPackageRaw && !dryRun) writeFileSync(rootPackagePath, rootPackageText)

for (const ws of workspaces) {
  let text = ws.raw
  text = text.replace(/("version":\s*)"[^"]*"/, `$1"${newVersion}"`)
  for (const name of workspaceNames) {
    text = text.replace(new RegExp(`("${escapeRegExp(name)}":\\s*)"[^"]*"`, 'g'), `$1"${newVersion}"`)
  }
  if (text !== ws.raw && !dryRun) writeFileSync(ws.path, text)
}

const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit' })

if (!dryRun) {
  // 2. reconcile the lockfile with the bumped versions + pinned specifiers
  run('npm', ['install', '--package-lock-only'])
}

// 3. build all packages from the (bumped) sources
run('npm', ['run', 'build:packages'])

// 4. publish each publishable package in dependency order
const publishable = PUBLISH_ORDER.filter((name) => workspaceNames.has(name)).filter(
  (name) => !workspaces.find((w) => w.json.name === name).json.private
)
for (const name of publishable) {
  const publishArgs = ['publish', '-w', name, '--access', 'public', '--tag', distTag]
  if (dryRun) publishArgs.push('--dry-run')
  run('npm', publishArgs)
}

console.log(`\n${dryRun ? 'dry run complete — no files written, nothing published' : `published ${publishable.length} packages at ${newVersion}`}`)
if (!dryRun) console.log(`next: commit the version bump and tag the release (e.g. git tag v${newVersion})`)
