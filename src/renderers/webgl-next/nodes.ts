import { Graphics, MSAA_QUALITY, Matrix, RenderTexture, Renderer, Sprite } from 'pixi.js-legacy'
import { InternalRenderer } from '.'

const range = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample)
  const xDimension = Math.ceil(side * step)
  const yDimension = Math.floor(side * step)
  let i = 0

  for (let x = -(xDimension / 2); x <= xDimension / 2; x += step) {
    for (let y = -(yDimension / 2); y <= yDimension / 2; y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y]
      }
    }
  }
}


/**
 * geometry
 */
// export class Nodes {

//   constructor(renderer: InternalRenderer<any, any>) {
//     const GRAPHIC = new Graphics()
//       .beginFill(0xffffff)
//       .drawCircle(0, 0, 2)

//     for (const [x, y] of range(100000, 50, 0.5)) {
//         // const circle = GRAPHIC.clone()

//         // circle.tint = 0xff4444
//         // circle.cullable = true
//         // circle.scale.set(5)
//         // circle.x = x + 30
//         // circle.y = y + 30
    
//         // renderer.root.addChild(circle)
//     }
//   }
// }

/**
 * texture
 * https://codesandbox.io/s/pixi-graphics-post-attempt-4-hlgs33?from-embed=&file=/src/index.ts
 */
export class Nodes {

  renderer: InternalRenderer

  constructor(renderer: InternalRenderer<any, any>) {
    this.renderer = renderer

    const GRAPHIC = new Graphics()
      .beginFill(0xffffff)
      .drawCircle(0, 0, 1000)

    const renderTexture = RenderTexture.create({
      width: GRAPHIC.width,
      height: GRAPHIC.height,
      multisample: MSAA_QUALITY.HIGH,
      resolution: 2
    })

    this.renderer.app.renderer.render(GRAPHIC, { renderTexture, transform: new Matrix(1, 0, 0, 1, GRAPHIC.width / 2, GRAPHIC.height / 2) })

    if (this.renderer.app.renderer instanceof Renderer) {
      this.renderer.app.renderer.framebuffer.blit()
    }

    GRAPHIC.destroy(true)

    for (const [x, y] of range(100000, 50, 0.5)) {
      const circle = new Sprite(renderTexture)

      circle.tint = 0xff4444
      circle.cullable = true
      circle.scale.set(0.01)
      circle.x = x
      circle.y = y

      renderer.root.addChild(circle)
    }
  }

  update = () => {

  }

  delete = () => {

  }
}
