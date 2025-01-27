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

export const gravityField = (G: number, r: Vec, mass: number): Vec => {
  const len = length(r)
  return mult(r, (G * mass) / (len * len * len))
}

export const gravityForce = (mass: number, gField: Vec): Vec =>
  mult(gField, mass)

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
  return mult(r, charge / (pi4 * len * len * len * permittivity))
}

export const electricForce = (charge: number, eField: Vec): Vec =>
  mult(eField, charge)

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
  return (permeability * crossPlane(v, r) * charge) / (pi4 * len * len * len)
}

/**
 * Calculate the force on a charged particle due to a magnetic field
 * @param charge the charge of the affected particle
 * @param v the velocity of the affected particle
 * @param bField the magnetic field vector
 */
export const magneticForce = (charge: number, v: Vec, bField: number): Vec =>
  crossOrthogonal(v, bField * charge)

export const emField = (
  permittivity: number,
  permeability: number,
  r: Vec,
  charge: number,
  v: Vec,
): [Vec, number] => {
  const len = length(r)
  const k = charge / (pi4 * len * len * len)
  return [mult(r, k / permittivity), k * permeability * crossPlane(v, r)]
}

export const emForce = (charge: number, v: Vec, e: Vec, b: number): Vec =>
  add(electricForce(charge, e), magneticForce(charge, v, b))

export const clipForce = (force: Vec, max: number): Vec => {
  const len2 = lengthSq(force)
  if (len2 < max * max) {
    return force
  }
  return mult(normalise(force), max)
}

export const kineticEnergy = (mass: number, vel: Vec): number =>
  0.5 * mass * lengthSq(vel)
