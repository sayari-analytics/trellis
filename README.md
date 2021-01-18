# Trellis
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

<!-- ## Usage
```js

``` -->

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
Trellis decouples graph rendering from graph layout computations, and decouples both from framework-specific bindings. This means, at the expense of a little extra setup, integrating any of Trellis module with an existing application should be relatively straightforward. Similar to rendering libraries like React, Trellis focuses on performant rendering and graph-based computations, leaving questions of state management to the user. Moreover, by splitting responsibilities into separate modules, if existing modules don't fit your needs, you can always roll your own, while still benefiting from the remaining modules that are helpful.

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
