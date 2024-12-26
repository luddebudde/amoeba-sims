import { Application, Container, Graphics } from "pixi.js"
import {
  add,
  div,
  dot,
  length,
  lengthSq,
  mult,
  normalise,
  origin,
  sub,
  sum,
  Vec,
} from "./vec.ts"
import { randomInCircle } from "./math.ts"

export type Game = Awaited<ReturnType<typeof createGame>>

export type Particle = {
  pos: Vec
  vel: Vec
}

const createParticleGraphic = (config: Config): Graphics => {
  // Create a Graphics object
  const redDot = new Graphics()

  // Draw a red circle (dot)
  redDot.fill(0xff0000) // Red color
  redDot.circle(0, 0, 1) // x=0, y=0, radius=10
  redDot.scale = config.particleRadius
  redDot.fill()
  return redDot
}

export type Config = {
  charge: number
  springCoeff: number
  airResistanceCoeff: number
  springDampingCoeff: number
  particleRadius: number
  mass: number
  rOffset: number
}

function dampingForce(
  thisParticle: Particle,
  otherParticle: Particle,
  config: Config,
) {
  const r = sub(thisParticle.pos, otherParticle.pos)
  const rAbs = length(r)
  const rNorm = div(r, rAbs)

  const relV = sub(thisParticle.vel, otherParticle.vel)
  const dxdt = dot(relV, rNorm)
  const damping = mult(rNorm, -dxdt * config.springDampingCoeff)
  const dampingForceAbs =
    (config.particleRadius * 2 - rAbs) * config.springCoeff
  const dampingForce = mult(rNorm, dampingForceAbs)
  return add(dampingForce, damping)
}

export const forceFromParticle = (
  thisParticle: Particle,
  otherParticle: Particle,
  config: Config,
): Vec => {
  const r = sub(thisParticle.pos, otherParticle.pos)
  const rAbs = length(r)
  const rNorm = div(r, rAbs)

  const k1 = -config.springCoeff
  const k2 = config.charge
  const rPlus = rAbs + config.rOffset
  const forceAbs = k1 / rPlus + k2 / rPlus ** 2

  const force = mult(rNorm, forceAbs)
  const damping =
    rAbs > config.particleRadius * 2
      ? origin
      : dampingForce(thisParticle, otherParticle, config)

  return add(force, damping)
}

function calculateForce(
  particle: Particle,
  mapRadius: number,
  config: Config,
  particles: Particle[],
) {
  const fieldR = sub(origin, particle.pos)
  const fieldRNorm = normalise(fieldR)

  const fieldForce =
    lengthSq(fieldR) > mapRadius ** 2
      ? mult(fieldRNorm, (length(fieldR) - mapRadius) * 0.001)
      : { x: 0, y: 0 }

  const airResistance = mult(particle.vel, -config.airResistanceCoeff)

  const otherParticleForce = particles.reduce(
    (force, otherParticle) => {
      if (particle === otherParticle) {
        return force
      }

      const f = forceFromParticle(particle, otherParticle, config)

      force.x += f.x
      force.y += f.y

      return force
    },
    { x: 0, y: 0 },
  )
  return sum(fieldForce, otherParticleForce, airResistance)
}

export const createGame = async (
  root: HTMLElement,
  particleCount: number,
  initialConfig: Config,
) => {
  let config = initialConfig

  // Create a new application
  const app = new Application()

  // Initialize the application
  await app.init({ background: "#292626", resizeTo: root })
  // #1099bb
  const world = new Container()
  world.position.set(app.screen.width / 2, app.screen.height / 2)

  // Append the application canvas to the document body
  root.appendChild(app.canvas)

  const mapRadius = Math.min(app.screen.width, app.screen.height) / 2

  let particlesT0: Particle[] = Array.from({ length: particleCount }).map(
    () => ({
      pos: randomInCircle(mapRadius),
      vel: randomInCircle(1),
    }),
  )
  let particlesT1 = structuredClone(particlesT0)

  const particleGraphics: Graphics[] = particlesT0.map(() =>
    createParticleGraphic(config),
  )

  const boundary = new Graphics()
  boundary.stroke(0x333333) // Red color
  boundary.circle(0, 0, mapRadius)
  boundary.stroke()
  world.addChild(boundary)

  particleGraphics.forEach((particle) => {
    world.addChild(particle)
  })

  app.stage.addChild(world)

  app.ticker.add((time) => {
    const dt = time.deltaTime

    particlesT0.forEach((particleT0, index) => {
      const particleT1 = particlesT1[index]
      const force = calculateForce(particleT0, mapRadius, config, particlesT0)

      const acc = div(force, config.mass)
      const dVel = mult(acc, dt)

      const v1 = sum(particleT0.vel, dVel)
      particleT1.vel = v1
      particleT1.pos = sum(particleT0.pos, v1)
    })

    // Draw the particles
    particlesT1.forEach((particle, index) => {
      particleGraphics[index].position.copyFrom(particle.pos)
    })
    const tmp = particlesT0
    particlesT0 = particlesT1
    particlesT1 = tmp
  })
  return {
    destroy: () => {
      root.removeChild(app.canvas)
      app.destroy()
    },
    setConfig: (newConfig: Config) => {
      config = newConfig
      particlesT0.forEach((_, index) => {
        particleGraphics[index].scale = config.particleRadius
      })
    },
  }
}
