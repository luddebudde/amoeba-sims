import { describe, expect, it, test } from 'vitest'
import { barnesHutTree, Rectangle } from './barnes-hut.ts'
import { add, div, mult } from './vec.ts'

type Particle = {
  pos: { x: number; y: number }
  mass: number
}

const getQuantity = (particle: Particle) => particle
const combine = (p1: Particle, p2: Particle) => ({
  pos: div(
    add(mult(p1.pos, p1.mass), mult(p2.pos, p2.mass)),
    p1.mass + p2.mass,
  ),
  mass: p1.mass + p2.mass,
})

const getPos = (particle: Particle) => particle.pos

const emptyRectangle: Rectangle = {
  pos: { x: 0, y: 0 },
  width: 0,
  height: 0,
}

describe('barnesHut', () => {
  describe('quandrant splitting', () => {
    test('empty input results in an empty leaf', () => {
      expect(barnesHutTree([], getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'empty-leaf',
          bounds: emptyRectangle,
        }),
      )
    })
    test('single particle results in a leaf', () => {
      const particles: Particle[] = [{ pos: { x: 0, y: 0 }, mass: 1 }]
      expect(barnesHutTree(particles, getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'leaf',
          bounds: {
            pos: { x: 0, y: 0 },
            width: 0,
            height: 0,
          },
          data: particles[0],
        }),
      )
    })
    test('two particles in tl and br quadrants', () => {
      const particles: Particle[] = [
        { pos: { x: -1, y: -1 }, mass: 1 },
        { pos: { x: 1, y: 1 }, mass: 1 },
      ]
      expect(barnesHutTree(particles, getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'tree',
          bounds: {
            pos: { x: -1, y: -1 },
            width: 2,
            height: 2,
          },
          tl: expect.objectContaining({
            tag: 'leaf',
            data: particles[0],
          }),
          tr: expect.objectContaining({
            tag: 'empty-leaf',
          }),
          bl: expect.objectContaining({
            tag: 'empty-leaf',
          }),
          br: expect.objectContaining({
            tag: 'leaf',
            data: particles[1],
          }),
        }),
      )
    })
    test('three particles in tl, tr, and br quadrants', () => {
      const particles: Particle[] = [
        { pos: { x: -1, y: -1 }, mass: 1 },
        { pos: { x: 1, y: -1 }, mass: 1 },
        { pos: { x: 1, y: 1 }, mass: 1 },
      ]
      expect(barnesHutTree(particles, getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'tree',
          bounds: {
            pos: { x: -1, y: -1 },
            width: 2,
            height: 2,
          },
          tl: expect.objectContaining({
            tag: 'leaf',
            data: particles[0],
          }),
          tr: expect.objectContaining({
            tag: 'leaf',
            data: particles[1],
          }),
          bl: expect.objectContaining({
            tag: 'empty-leaf',
          }),
          br: expect.objectContaining({
            tag: 'leaf',
            data: particles[2],
          }),
        }),
      )
    })
    test('three particles where two are in the same quadrant', () => {
      const particles: Particle[] = [
        { pos: { x: -1, y: -1 }, mass: 1 },
        { pos: { x: -0.9, y: -0.9 }, mass: 1 },
        { pos: { x: 1, y: 1 }, mass: 1 },
      ]
      expect(barnesHutTree(particles, getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'tree',
          bounds: {
            pos: { x: -1, y: -1 },
            width: 2,
            height: 2,
          },
          tl: expect.objectContaining({
            tag: 'tree',
          }),
          br: expect.objectContaining({
            tag: 'leaf',
            data: particles[2],
          }),
        }),
      )
    })
    test('that when two particles are in the same quadrant, they are still split into a tree', () => {
      const particles: Particle[] = [
        { pos: { x: -1, y: -1 }, mass: 1 },
        { pos: { x: -0.25, y: -0.25 }, mass: 1 },
        { pos: { x: 1, y: 1 }, mass: 1 },
      ]
      expect(barnesHutTree(particles, getPos, getQuantity, combine)).toEqual(
        expect.objectContaining({
          tag: 'tree',
          bounds: {
            pos: { x: -1, y: -1 },
            width: 2,
            height: 2,
          },
          tl: expect.objectContaining({
            tag: 'tree',
            tl: expect.objectContaining({
              tag: 'leaf',
              data: particles[0],
            }),
            br: expect.objectContaining({
              tag: 'leaf',
              data: particles[1],
            }),
          }),
          br: expect.objectContaining({
            tag: 'leaf',
            data: particles[2],
          }),
        }),
      )
    })
  })
  describe('quantity combining', () => {
    test('combines mass', () => {
      const particles: Particle[] = [
        { pos: { x: 0, y: 0 }, mass: 1 },
        { pos: { x: 2, y: 2 }, mass: 1 },
      ]
      const tree = barnesHutTree(particles, getPos, getQuantity, combine)
      expect(tree).toEqual(
        expect.objectContaining({
          tag: 'tree',
          quantity: expect.objectContaining({
            mass: 2,
          }),
        }),
      )
    })
    test('combines position', () => {
      const particles: Particle[] = [
        { pos: { x: 0, y: 0 }, mass: 1 },
        { pos: { x: 2, y: 2 }, mass: 1 },
      ]
      const tree = barnesHutTree(particles, getPos, getQuantity, combine)
      expect(tree).toEqual(
        expect.objectContaining({
          tag: 'tree',
          quantity: expect.objectContaining({
            pos: {
              x: 1,
              y: 1,
            },
          }),
        }),
      )
    })

    test('combines center of mass', () => {
      const particles: Particle[] = [
        { pos: { x: 1.1, y: 2 }, mass: 3 },
        { pos: { x: 4, y: 5 }, mass: 6 },
      ]
      const tree = barnesHutTree(particles, getPos, getQuantity, combine)
      expect(tree).toEqual(
        expect.objectContaining({
          tag: 'tree',
          quantity: expect.objectContaining({
            mass: 3 + 6,
            pos: {
              x: (1.1 * 3 + 4 * 6) / (3 + 6),
              y: (2 * 3 + 5 * 6) / (3 + 6),
            },
          }),
        }),
      )
    })

    it('recursively combines quantities in subtrees', () => {
      const particles: Particle[] = [
        //   Second quadrant
        { pos: { x: -1, y: -1 }, mass: 1 },
        //   Second quadrant
        { pos: { x: -0.2, y: -0.2 }, mass: 2 },
        //   Fourth quadrant
        { pos: { x: 1, y: 1 }, mass: 3 },
      ]
      const tree = barnesHutTree(particles, getPos, getQuantity, combine)
      // Root
      expect(tree).toEqual(
        expect.objectContaining({
          tag: 'tree',
          quantity: expect.objectContaining({
            mass: 1 + 2 + 3,
            pos: {
              x: (-1 * 1 + -0.2 * 2 + 1 * 3) / (1 + 2 + 3),
              y: (-1 * 1 + -0.2 * 2 + 1 * 3) / (1 + 2 + 3),
            },
          }),
          tl: expect.objectContaining({
            tag: 'tree',
            quantity: expect.objectContaining({
              mass: 1 + 2,
              pos: {
                x: (-1 * 1 + -0.2 * 2) / (1 + 2),
                y: (-1 * 1 + -0.2 * 2) / (1 + 2),
              },
            }),
          }),
        }),
      )
    })
  })
})
