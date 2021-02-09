# Trellis
[![npm version](https://badge.fury.io/js/%40sayari%2Ftrellis.svg)](https://badge.fury.io/js/%40sayari%2Ftrellis)

A highly performant network visualization library with a simple, declarative API, plugable renderers, and bindings for different frameworks and use cases

## Installation
if using npm
```bash
npm install @sayari/trellis
```

or alternatively import via HTML
```html
<script src='https://unpkg.com/@sayari/trellis@{VERSION}/index.umd.min.js'></script>
```

## Examples

- [Static Graph](https://observablehq.com/@julietadams/trellis-static-graph-example-2?collection=@julietadams/trellis-examples)
- [Viewport Interactions](https://observablehq.com/@julietadams/trellis-viewport-interaction-example?collection=@julietadams/trellis-examples)
- [Node Interactions](https://observablehq.com/@julietadams/trellis-node-interaction-example)
- [Hierarchy Layout](https://observablehq.com/@julietadams/trellis-hierarchy?collection=@julietadams/trellis-examples)
- [React Bindings](https://codesandbox.io/s/trellis-react-example-84mex?file=/src/Graph.js)
- [React Selection Multiselect Tool](https://codesandbox.io/s/trellis-react-and-selection-example-68dg5?file=/src/Graph.js)

## Modules
- renderers
  - WebGL
  - png/jpg
- layout
  - force
  - hierarchy
  - cluster
  - subgraphs
- bindings
  - react
  - native

## Philosophy
Trellis decouples graph rendering from graph layout computations, and decouples both from framework-specific bindings. Additionally, the Trellis renderer is mostly stateless, leaving questions of state management to the application and allowing for simple customization of library behavior. This means integrating any of Trellis modules with an existing application should be relatively straightforward. Similar to rendering libraries like React, Trellis focuses on performant rendering and graph-based computations, while remaining agnostic about where and how state is managed. Moreover, by splitting responsibilities into separate modules, if existing modules don't fit your needs, you can always roll your own, while still benefiting from the remaining modules that are helpful.

## See Also
- Sigma js

### Development
```bash
npm run dev
```

### Deployment
prerelease
```bash
npm version [premajor|preminor|prepatch|prerelease] --preid rc

git push --follow-tags

npm run build

cp package.* README.md dist/

npm publish dist/ --tag next
```

release
```bash
npm version [major|minor|patch]

git push --follow-tags

npm run build

cp package.* README.md dist/

npm publish dist/
```
