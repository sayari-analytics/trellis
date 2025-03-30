import { Indexable } from '.'

/**
 * A quadtree index to index 2D shapes for efficient coordinate lookup
 * Objects whose bounding box overlaps multiple quadtree nodes are indexed in all nodes
 *
 * A Quadtree is a node with a bounding box.
 * If the node is a leaf node, it has a list of objects contained in the node's bounding box.
 * Otherwise, it is an intermediary node, has no objects,
 * and has four subnodes dividing its bounds into four equally-sized quadrants.
 * Once a leaf node surpasses the max object count, and as long as it's not at the max depth,
 * it splits into four subnodes and all its objects are added to the subnodes they overlap with.
 * Subnodes are oriented left to right, top to bottom,
 * with the minimum X/Y coordinate in the top left quadrant matching a screens coordinate system.
 * Unlike a mathematical cartesian plane, which is oriented bottom to top, with the
 * minimum X/Y coordinate in the _bottom_ left.
 *
 *    -       -
 *  - |-------- +
 *    | 1 | 0 |
 *    |--------
 *    | 2 | 3 |
 *  - |-------- +
 *    +       +
 *
 * TODO
 * - replace quadtree x/y/width/height with minX/minY/maxX/maxY. and elminate top/bottom/left/right orientation references
 * - add zIndex to Indexable, sort Quadtree.objects by zIndex, and have find only return the object with the highest zIndex
 *
 * modified from https://github.com/timohausmann/quadtree-ts
 *
 */
export class Quadtree<T extends Indexable = Indexable> {
  private centerX: number
  private centerY: number
  private objects?: T[]
  private nodes?: [one: Quadtree<T>, two: Quadtree<T>, three: Quadtree<T>, four: Quadtree<T>]

  constructor(
    private minX: number,
    private minY: number,
    private maxX: number,
    private maxY: number,
    private maxObjects: number,
    private maxLevels: number,
    private level = 0
  ) {
    this.centerX = this.minX + (this.maxX - this.minX) / 2
    this.centerY = this.minY + (this.maxY - this.minY) / 2
  }

  /**
   * Insert an object into the node. If the node exceeds the capacity,
   * it will split and add all objects to their corresponding subnodes
   */
  add(object: T): boolean {
    // discard objects that are out of bounds
    if (this.level === 0) {
      if ((object.maxX <= this.minX || object.minX >= this.maxX) && (object.maxY <= this.minY || object.minY >= this.maxY)) {
        return false
      }
    }

    // if we have subnodes, add to matching subnodes
    if (this.nodes) {
      for (const nodeId of object.subnodes(this.centerX, this.centerY)) {
        this.nodes[nodeId].add(object)
      }
    } else {
      // otherwise, store object here
      this.objects ??= []
      this.objects.push(object)

      // maxObjects reached
      if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
        // split the node into subnodes
        const level = this.level + 1

        this.nodes = [
          new Quadtree(this.centerX, this.minY, this.maxX, this.centerY, this.maxObjects, this.maxLevels, level),
          new Quadtree(this.minX, this.minY, this.centerX, this.centerY, this.maxObjects, this.maxLevels, level),
          new Quadtree(this.minX, this.centerY, this.centerX, this.maxY, this.maxObjects, this.maxLevels, level),
          new Quadtree(this.centerX, this.centerY, this.maxX, this.maxY, this.maxObjects, this.maxLevels, level)
        ]

        // add all objects to their corresponding subnode
        for (const object of this.objects) {
          for (const nodeId of object.subnodes(this.centerX, this.centerY)) {
            this.nodes[nodeId].add(object)
          }
        }

        // clean up this node
        this.objects = undefined
      }
    }

    return true
  }

  /**
   * Return first object that contains the given point
   */
  find(x: number, y: number): T | undefined {
    if (this.nodes) {
      // search subnodes
      if (x >= this.centerX) {
        if (y >= this.centerY) {
          return this.nodes[3].find(x, y)
        } else {
          return this.nodes[0].find(x, y)
        }
      } else {
        if (y >= this.centerY) {
          return this.nodes[2].find(x, y)
        } else {
          return this.nodes[1].find(x, y)
        }
      }
    } else if (this.objects) {
      // leaf node, return the last inserted object that contains point
      for (let i = this.objects.length - 1; i >= 0; i--) {
        if (this.objects[i].contains(x, y)) {
          return this.objects[i]
        }
      }
    }
  }

  /**
   * Return all objects that contains the given point
   */
  findAll(x: number, y: number, result: T[] = []): T[] {
    if (this.nodes) {
      // search subnodes
      if (x >= this.centerX) {
        if (y >= this.centerY) {
          return this.nodes[3].findAll(x, y, result)
        } else {
          return this.nodes[0].findAll(x, y, result)
        }
      } else {
        if (y >= this.centerY) {
          return this.nodes[2].findAll(x, y, result)
        } else {
          return this.nodes[1].findAll(x, y, result)
        }
      }
    } else if (this.objects) {
      // leaf node, return objects that contain point
      for (const object of this.objects) {
        if (object.contains(x, y)) {
          result.push(object)
        }
      }
    }

    // remove duplicates
    if (this.level === 0 && result.length > 1) {
      return Array.from(new Set(result))
    }

    return result
  }

  /**
   * Remove an object from the tree
   */
  remove(object: T): boolean {
    if (this.nodes) {
      // remove from subnodes
      for (const nodeId of object.subnodes(this.centerX, this.centerY)) {
        this.nodes[nodeId].remove(object)
      }
    } else if (this.objects) {
      // leaf node, remove object if it exists
      const indexOf = this.objects.indexOf(object)

      // remove objects
      if (indexOf > -1) {
        this.objects.splice(indexOf, 1)
        return true
      } else {
        return false
      }
    }

    return false
  }

  /**
   * merge and remove empty subnodes
   */
  prune(): T[] {
    // recursive join
    const allObjects = Array.from(this.objects ?? [])
    if (this.nodes) {
      for (let i = 0; i < this.nodes.length; i++) {
        allObjects.push(...this.nodes[i].prune())
      }
    }

    // remove duplicates
    const uniqueObjects = Array.from(new Set(allObjects))

    if (uniqueObjects.length <= this.maxObjects) {
      this.objects = uniqueObjects
      if (this.nodes) {
        for (let i = 0; i < this.nodes.length; i++) {
          this.nodes[i].objects = []
        }
      }
      this.nodes = undefined
    }

    return allObjects
  }

  /**
   * Clear the Quadtree
   */
  clear(): void {
    this.objects = undefined

    if (this.nodes) {
      for (let i = 0; i < this.nodes.length; i++) {
        if (this.nodes.length) {
          this.nodes[i].clear()
        }
      }
    }

    this.nodes = undefined
  }
}
