A highly performant network visualization library with a simple, declarative API and plugable renderers

## Philosophy
This library primarily a loosely opinionated wrapper around existing projects, chiefly D3's [force](https://github.com/d3/d3-force) library, alongside various rendering libraries, including [pixijs](https://www.pixijs.com), [react](https://reactjs.org/), and d3's own [selection](https://github.com/d3/d3-selection) rendering library.  Plenty of other projects try to tame the sometimes obscure API fronting D3, or alternatively to provide smart bindings between d3 and other rendering frameworks like react.  Like those, this project tries to strike a balance between flexibility and ease of use.  It is designed to be highly modular, splitting application bindings from layout computation from graphical rendering, so if any of the provided solutions don't fit your specific needs, you can roll your own.

## See Also
- Sigma js

### Development
```bash
npm run dev
```

### Deployment
```bash
npm run build
git commit [filepaths]

# tag major/minor/patch release
npm version [major|minor|patch]
# OR tag release candidate
git tag -a -m"release candidate" v[major].[minor]-rc[number] # e.g. git tag -a -m"release candidate" v1.0-rc2

git push --follow-tags

npm publish
```
