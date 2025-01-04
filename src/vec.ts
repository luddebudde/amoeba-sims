export type Vec = {
  x: number
  y: number
}

export const origin: Vec = { x: 0, y: 0 }

export const add = (a: Vec, b: Vec): Vec => ({
  x: a.x + b.x,
  y: a.y + b.y,
})

export const sum = (...vecs: Vec[]): Vec => {
  return vecs.reduce(add, origin)
}
export const sub = (a: Vec, b: Vec): Vec => ({
  x: a.x - b.x,
  y: a.y - b.y,
})

export const mult = (a: Vec, b: number): Vec => ({
  x: a.x * b,
  y: a.y * b,
})

export const div = (a: Vec, b: number): Vec => ({
  x: a.x / b,
  y: a.y / b,
})

export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y

export const length = (a: Vec): number => Math.sqrt(a.x * a.x + a.y * a.y)
export const lengthSq = (a: Vec): number => a.x * a.x + a.y * a.y

export const normalise = (a: Vec): Vec => div(a, length(a))
