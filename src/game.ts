import {
  Application,
  Container,
  Geometry,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js'
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
} from './vec.ts'
import { randomInCircle } from './math.ts'
import * as PIXI from 'pixi.js'
import vertex from './fade.vert?raw'
import fragment from './fade.frag?raw'

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
  rOffset: number
  rScale: number
  k1: number
  k2: number
  maxAbs: number
  springCoeff: number
  airResistanceCoeff: number
  springDampingCoeff: number
  particleRadius: number
  mass: number
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

  const k1 = config.k1
  const k2 = config.k2
  const rPlus = (1 / config.rScale) * rAbs - config.rOffset
  const forceAbs = Math.max(
    Math.min(k1 / rPlus ** 3 + k2 / rPlus ** 2, config.maxAbs),
    -config.maxAbs,
  )

  if (Math.random() > 0.9998) {
  }
  const force = mult(rNorm, forceAbs)
  const damping =
    rAbs > config.particleRadius * 2
      ? origin
      : dampingForce(thisParticle, otherParticle, config)
  //gbdgdgdd
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
  await app.init({ background: '#292626', resizeTo: root })
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
  let particlesTHalf = structuredClone(particlesT0)

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

  let kineticEnergy = 0

  const text = new Text({
    text: 'Hello',
    style: new TextStyle({
      fill: 'white',
    }),
  })

  app.stage.addChild(text)
  app.stage.addChild(world)

  // mesh.position.set(-100, -100)
  // app.stage.addChild(mesh)

  app.ticker.add((time) => {
    const dt = time.deltaTime

    console.log(dt)

    kineticEnergy = particlesT0.reduce((acc, particle) => {
      return acc + 0.5 * config.mass * lengthSq(particle.vel)
    }, 0)

    text.text = `Kinetic Energy: ${kineticEnergy.toFixed(2)} J`

    particlesT0.forEach((particleT0, index) => {
      const particleTHalf = particlesTHalf[index]
      const force = calculateForce(particleT0, mapRadius, config, particlesT0)

      const acc = div(force, config.mass)
      const dVel = mult(acc, dt / 2)

      const v = sum(particleT0.vel, dVel)
      particleTHalf.vel = v
      particleTHalf.pos = sum(particleT0.pos, v)
    })

    particlesT0.forEach((particleT0, index) => {
      const particleTHalf = particlesTHalf[index]
      const particleT1 = particlesT1[index]

      particleT1.pos = sum(particleT0.pos, mult(particleTHalf.vel, dt))
      particleTHalf.pos = particleT1.pos
    })

    particlesT0.forEach((particleT0, index) => {
      const particleTHalf = particlesTHalf[index]
      const particleT1 = particlesT1[index]

      const force = calculateForce(
        particleTHalf,
        mapRadius,
        config,
        particlesTHalf,
      )

      const acc = div(force, config.mass)
      const dVel = mult(acc, dt / 2)

      const v = sum(particleTHalf.vel, dVel)
      particleT1.vel = v
    })

    // particlesT0.forEach((particleT0, index) => {
    //   const particleT1 = particlesT1[index]
    //   const force = calculateForce(particleT0, mapRadius, config, particlesT0)

    //   const acc = div(force, config.mass)
    //   const dVel = mult(acc, dt)

    //   const v1 = sum(particleT0.vel, dVel)
    //   particleT1.vel = v1
    //   particleT1.pos = sum(particleT0.pos, v1)
    // })

    //   // Draw the particles
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

const geometry = new PIXI.Geometry({
  attributes: {
    aPosition: [
      // x y
      0, 0,
      // x y
      1, 0,
      // x y
      0, 1,
      // x y
      1, 1,
    ].map((it) => it * 1000),
    aUV: [
      // x y
      0, 0,
      // x y
      1, 0,
      // x y
      0, 1,
      // x y
      1, 1,
    ],
  },
  indexBuffer: [
    // First
    0, 1, 2,
    // Second
    1, 2, 3,
  ],
})

const shader = PIXI.Shader.from({
  gl: {
    vertex,
    fragment,
  },
})

const mesh = new PIXI.Mesh({
  geometry,
  shader,
})
