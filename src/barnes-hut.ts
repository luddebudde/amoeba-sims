import { Vec } from './vec.ts'

export type Rectangle = {
  pos: Vec
  width: number
  height: number
}

export type QuadTree<T, Q> = Tree<T, Q> | Leaf<T, Q> | EmptyLeaf

export type Tree<T, Q> = {
  tag: 'tree'
  bounds: Rectangle
  tl: QuadTree<T, Q>
  tr: QuadTree<T, Q>
  bl: QuadTree<T, Q>
  br: QuadTree<T, Q>
  quantity: Q
}

export type Leaf<T, Q> = {
  tag: 'leaf'
  bounds: Rectangle
  data: T
  quantity: Q
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

export const barnesHutTree = <T, Q>(
  particles: T[],
  getPos: (particle: T) => Vec,
  getQuantity: (particle: T) => Q,
  combine: (q1: Q, q2: Q) => Q,
): QuadTree<T, Q> => {
  return particles.reduce<QuadTree<T, Q>>(
    (tree, particle) =>
      insertParticle(tree, particle, getPos, getQuantity, combine),
    {
      tag: 'empty-leaf',
      bounds: getBoundingRectangle(particles, getPos),
    },
  )
}

const isTL = (pos: Vec, bounds: Rectangle): boolean =>
  pos.x < bounds.pos.x + bounds.width / 2 &&
  pos.y < bounds.pos.y + bounds.height / 2

const isTR = (pos: Vec, bounds: Rectangle): boolean =>
  pos.x >= bounds.pos.x + bounds.width / 2 &&
  pos.y < bounds.pos.y + bounds.height / 2

const isBL = (pos: Vec, bounds: Rectangle): boolean =>
  pos.x < bounds.pos.x + bounds.width / 2 &&
  pos.y >= bounds.pos.y + bounds.height / 2

const isBR = (pos: Vec, bounds: Rectangle): boolean =>
  pos.x >= bounds.pos.x + bounds.width / 2 &&
  pos.y >= bounds.pos.y + bounds.height / 2

const insertParticle = <T, Q>(
  tree: QuadTree<T, Q>,
  particle: T,
  getPos: (particle: T) => Vec,
  getQuantity: (particle: T) => Q,
  combine: (q1: Q, q2: Q) => Q,
): QuadTree<T, Q> => {
  switch (tree.tag) {
    case 'empty-leaf':
      // If the leaf is empty, we can insert the particle directly
      return {
        tag: 'leaf',
        bounds: tree.bounds,
        data: particle,
        quantity: getQuantity(particle),
      }
    case 'leaf':
      // If the leaf already has data, we need to split it into four
      return insertParticle(
        constructTree(tree, getPos),
        particle,
        getPos,
        getQuantity,
        combine,
      )
    case 'tree':
      // If the tree has children, we need to find the correct child to insert into
      const pos = getPos(particle)
      const bounds = tree.bounds
      if (isTL(pos, bounds)) {
        return {
          ...tree,
          tl: insertParticle(tree.tl, particle, getPos, getQuantity, combine),
          quantity: combine(tree.quantity, getQuantity(particle)),
        }
      } else if (isTR(pos, bounds)) {
        return {
          ...tree,
          tr: insertParticle(tree.tr, particle, getPos, getQuantity, combine),
          quantity: combine(tree.quantity, getQuantity(particle)),
        }
      } else if (isBL(pos, bounds)) {
        return {
          ...tree,
          bl: insertParticle(tree.bl, particle, getPos, getQuantity, combine),
          quantity: combine(tree.quantity, getQuantity(particle)),
        }
      } else {
        // Bottom-right
        return {
          ...tree,
          br: insertParticle(tree.br, particle, getPos, getQuantity, combine),
          quantity: combine(tree.quantity, getQuantity(particle)),
        }
      }
  }
}

const constructTree = <T, Q>(
  leaf: Leaf<T, Q>,
  getPos: (particle: T) => Vec,
): Tree<T, Q> => {
  const { data, bounds } = leaf
  const pos = getPos(data)
  const childBounds = splitBounds(bounds)
  const newTree: Tree<T, Q> = {
    tag: 'tree',
    bounds: leaf.bounds,
    quantity: leaf.quantity,
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
  }
  if (isTL(pos, bounds)) {
    return {
      ...newTree,
      tl: {
        tag: 'leaf',
        bounds: childBounds.tl,
        data,
        quantity: leaf.quantity,
      },
    }
  } else if (isTR(pos, bounds)) {
    return {
      ...newTree,
      tr: {
        tag: 'leaf',
        bounds: childBounds.tr,
        data,
        quantity: leaf.quantity,
      },
    }
  } else if (isBL(pos, bounds)) {
    return {
      ...newTree,
      bl: {
        tag: 'leaf',
        bounds: childBounds.bl,
        data,
        quantity: leaf.quantity,
      },
    }
  } else {
    return {
      ...newTree,
      br: {
        tag: 'leaf',
        bounds: childBounds.br,
        data,
        quantity: leaf.quantity,
      },
    }
  }
}

export const forEachNode = <T, Q>(
  tree: QuadTree<T, Q>,
  isFar: (node: Leaf<T, Q> | Tree<T, Q>) => boolean,
  callback: (node: Leaf<T, Q> | Tree<T, Q>) => void,
) => {
  switch (tree.tag) {
    case 'empty-leaf':
      return
    case 'leaf':
      callback(tree)
      return
    case 'tree':
      if (isFar(tree)) {
        // If the quantity is far enough, we can treat the whole tree as a single particle
        callback(tree)
      } else {
        forEachNode(tree.tl, isFar, callback)
        forEachNode(tree.tr, isFar, callback)
        forEachNode(tree.bl, isFar, callback)
        forEachNode(tree.br, isFar, callback)
      }
      return
  }
}
