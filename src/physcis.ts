import {
  crossPlane,
  Vec,
  length,
  crossOrthogonal,
  mult,
  lengthSq,
  add,
  normalise,
} from './vec.ts'

const pi4 = 4 * Math.PI

export const electricFieldAbs = (
  permittivity: number,
  r: Vec,
  charge: number,
): number => {
  return charge / (lengthSq(r) * permittivity * pi4)
}

export const electricField = (
  permittivity: number,
  r: Vec,
  charge: number,
): Vec => {
  const len = length(r)
  return mult(r, charge / (len * len * len * permittivity * pi4))
}

export const electricForce = (charge: number, e: Vec): Vec => mult(e, charge)

/**
 * Calculate the magnetic field at a point due to a moving charge
 * @param permeability
 * @param charge the charge of the moving particle
 * @param v the velocity of the charged particle
 * @param r the distance to the particle
 * @returns the length of the magnetic field vector, perpendicular to the plane of v and r
 */
export const magneticField = (
  permeability: number,
  r: Vec,
  charge: number,
  v: Vec,
): number => {
  const len = length(r)
  return (permeability * charge * crossPlane(v, r)) / (len * len * len * pi4)
}

/**
 * Calculate the force on a charged particle due to a magnetic field
 * @param charge the charge of the affected particle
 * @param v the velocity of the affected particle
 * @param b the magnetic field vector
 */
export const magneticForce = (charge: number, v: Vec, b: number): Vec =>
  crossOrthogonal(v, b * charge)

export const lorentzForce = (charge: number, v: Vec, e: Vec, b: number): Vec =>
  add(electricForce(charge, e), magneticForce(charge, v, b))

export const clipForce = (force: Vec, max: number): Vec => {
  const len2 = lengthSq(force)
  if (len2 < max * max) {
    return force
  }
  return mult(normalise(force), max)
}
