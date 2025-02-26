import { Texture } from 'pixi.js'
import { ITexture } from '.'
import { Assets } from '../assets'
import { noop } from '../../../utils/helpers'

export class ImageTexture implements ITexture {
  scaleFactor: number
  private textures: Record<string, Texture> = {}
  private loadCancelHandlers: (() => void)[] = []

  constructor(
    private imageAssets: Assets<Texture>,
    maxZoom: number
  ) {
    this.scaleFactor = maxZoom * 2
  }

  getTexture(imageUrl: string, onfulfilled: (texture: Texture) => void) {
    if (this.textures[imageUrl] === undefined) {
      const cancel = this.imageAssets.load(imageUrl, (texture) => {
        this.textures[imageUrl] = texture
        onfulfilled(this.textures[imageUrl])
      })
      this.loadCancelHandlers.push(cancel)
      return cancel
    } else {
      onfulfilled(this.textures[imageUrl])
      return noop
    }
  }

  delete() {
    for (const loadCancelHandler of this.loadCancelHandlers) {
      loadCancelHandler()
    }
    for (const id in this.textures) {
      this.textures[id].destroy()
    }
  }
}
