import { Vec } from './vec.ts'

export type Rectangle = {
  pos: Vec
  width: number
  height: number
}
export type QuadTree<T> = Tree<T> | Leaf<T> | EmptyLeaf

export type Tree<T> = {
  tag: 'tree'
  bounds: Rectangle
  tl: QuadTree<T>
  tr: QuadTree<T>
  bl: QuadTree<T>
  br: QuadTree<T>
}

export type Leaf<T> = {
  tag: 'leaf'
  bounds: Rectangle
  data: T
}

export type EmptyLeaf = {
  tag: 'empty-leaf'
  bounds: Rectangle
}

const splitBounds = (
  bounds: Rectangle,
): {
  tl: Rectangle
  tr: Rectangle
  bl: Rectangle
  br: Rectangle
} => {
  const halfWidth = bounds.width / 2
  const halfHeight = bounds.height / 2
  return {
    tl: {
      pos: bounds.pos,
      width: halfWidth,
      height: halfHeight,
    },
    tr: {
      pos: { x: bounds.pos.x + halfWidth, y: bounds.pos.y },
      width: halfWidth,
      height: halfHeight,
    },
    bl: {
      pos: { x: bounds.pos.x, y: bounds.pos.y + halfHeight },
      width: halfWidth,
      height: halfHeight,
    },
    br: {
      pos: { x: bounds.pos.x + halfWidth, y: bounds.pos.y + halfHeight },
      width: halfWidth,
      height: halfHeight,
    },
  }
}

const getBoundingRectangle = <T>(
  particles: T[],
  getPos: (particle: T) => Vec,
): Rectangle => {
  const bounds = particles.reduce(
    (acc, currentValue) => {
      const pos = getPos(currentValue)
      if (pos.x < acc.minX) {
        acc.minX = pos.x
      }
      if (pos.x > acc.maxX) {
        acc.maxX = pos.x
      }
      if (pos.y < acc.minY) {
        acc.minY = pos.y
      }
      if (pos.y > acc.maxY) {
        acc.maxY = pos.y
      }

      return acc
    },
    {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    },
  )
  return {
    pos: {
      x: bounds.minX,
      y: bounds.minY,
    },
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

export const barnesHutTree = <T>(
  particles: T[],
  getPos: (particle: T) => Vec,
): QuadTree<T> => {
  return particles.reduce<QuadTree<T>>(
    (tree, particle) => insertParticle(tree, particle, getPos),
    {
      tag: 'empty-leaf',
      bounds: getBoundingRectangle(particles, getPos),
    },
  )
}

const insertParticle = <T, Q>(
  tree: QuadTree<T>,
  particle: T,
  getPos: (particle: T) => Vec,
): QuadTree<T> => {
  switch (tree.tag) {
    case 'empty-leaf':
      // If the leaf is empty, we can insert the particle directly
      return {
        tag: 'leaf',
        bounds: tree.bounds,
        data: particle,
      }
    case 'leaf':
      // If the leaf already has data, we need to split it into four
      const existingParticle = tree.data
      const childBounds = splitBounds(tree.bounds)
      const newTree = insertParticle(
        {
          tag: 'tree',
          bounds: tree.bounds,
          tl: {
            tag: 'empty-leaf',
            bounds: childBounds.tl,
          },
          tr: {
            tag: 'empty-leaf',
            bounds: childBounds.tr,
          },
          bl: {
            tag: 'empty-leaf',
            bounds: childBounds.bl,
          },
          br: {
            tag: 'empty-leaf',
            bounds: childBounds.br,
          },
        },
        existingParticle,
        getPos,
      )
      return insertParticle(newTree, particle, getPos)
    case 'tree':
      // If the tree has children, we need to find the correct child to insert into
      const pos = getPos(particle)
      const bounds = tree.bounds
      if (
        pos.x < bounds.pos.x + bounds.width / 2 &&
        pos.y < bounds.pos.y + bounds.height / 2
      ) {
        // Top-left
        return {
          ...tree,
          tl: insertParticle(tree.tl, particle, getPos),
        }
      } else if (
        pos.x >= bounds.pos.x + bounds.width / 2 &&
        pos.y < bounds.pos.y + bounds.height / 2
      ) {
        // Top-right
        return {
          ...tree,
          tr: insertParticle(tree.tr, particle, getPos),
        }
      } else if (
        pos.x < bounds.pos.x + bounds.width / 2 &&
        pos.y >= bounds.pos.y + bounds.height / 2
      ) {
        // Bottom-left
        return {
          ...tree,
          bl: insertParticle(tree.bl, particle, getPos),
        }
      } else {
        // Bottom-right
        return {
          ...tree,
          br: insertParticle(tree.br, particle, getPos),
        }
      }
  }
}
