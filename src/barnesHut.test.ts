import { describe, it, expect, test } from 'vitest'
import { barnesHutTree, Rectangle } from './barnes-hut.ts'

type Particle = {
  pos: { x: number; y: number }
  mass: number
}

const getPos = (particle: Particle) => particle.pos

const emptyRectangle: Rectangle = {
  pos: { x: 0, y: 0 },
  width: 0,
  height: 0,
}

describe('barnesHut', () => {
  test('empty input results in an empty leaf', () => {
    expect(barnesHutTree([], getPos)).toEqual(
      expect.objectContaining({
        tag: 'empty-leaf',
        bounds: emptyRectangle,
      }),
    )
  })
  test('single particle results in a leaf', () => {
    const particles: Particle[] = [{ pos: { x: 0, y: 0 }, mass: 1 }]
    expect(barnesHutTree(particles, getPos)).toEqual(
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
    expect(barnesHutTree(particles, getPos)).toEqual(
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
    expect(barnesHutTree(particles, getPos)).toEqual(
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
    expect(barnesHutTree(particles, getPos)).toEqual(
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
    expect(barnesHutTree(particles, getPos)).toEqual(
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
