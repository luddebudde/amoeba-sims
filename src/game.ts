import {
  Application,
  Container,
  Graphics,
  Sprite,
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
import timeSmoothFragment from './shaders/timeSmooth.frag?raw'

export type Game = Awaited<ReturnType<typeof createGame>>

export type Particle = {
  pos: Vec
  vel: Vec
}

const createParticleGraphic = (config: ParticleConfig): Graphics => {
  // Create a Graphics object
  const redDot = new Graphics()

  // Draw a red circle (dot)
  redDot.beginFill(0xff0000) // Red color
  redDot.drawCircle(0, 0, 1) // x=0, y=0, radius=10
  redDot.scale = {
    x: config.particleRadius,
    y: config.particleRadius,
  }
  redDot.endFill()
  return redDot
}

export type ParticleConfig = {
  uid: string
  color: string
  particleCount: number
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

export type Scenario = {
  particles: ParticleConfig[]
}

function dampingForce(
  thisParticle: Particle,
  otherParticle: Particle,
  config: ParticleConfig,
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
  config: ParticleConfig,
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
  config: ParticleConfig,
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
  initialConfig: ParticleConfig,
) => {
  let config = initialConfig

  const app = new Application({
    background: '#292626',
    resizeTo: root,
  })
  const canvas = app.view as HTMLCanvasElement

  // Append the application canvas to the document body
  root.appendChild(canvas)

  const dimensions: Vec = {
    x: canvas.width,
    y: canvas.height,
  }

  const world = new Container()
  world.position.set(dimensions.x / 2, dimensions.y / 2)
  // Create a new container for rendering on a render texture with identical coordinate system
  const rendererWorld = new Container()
  rendererWorld.position.set(dimensions.x / 2, dimensions.y / 2)

  const mapRadius = Math.min(dimensions.x, dimensions.y) / 2

  let particlesT0: Particle[] = Array.from({ length: particleCount }).map(
    () => ({
      pos: randomInCircle(mapRadius),
      vel: randomInCircle(1),
    }),
  )
  let particlesT1 = structuredClone(particlesT0)
  let particlesTHalf = structuredClone(particlesT0)

  const renderTexture1 = PIXI.RenderTexture.create({
    width: dimensions.x,
    height: dimensions.y,
  })
  const renderTexture2 = PIXI.RenderTexture.create({
    width: dimensions.x,
    height: dimensions.y,
  })
  const gl = app.renderer.gl

  // WebGL texture setup with FLOAT texture format
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R32F, // Single 32-bit floating point channel
    dimensions.x,
    dimensions.y,
    0,
    gl.RED, // Use a single red channel for the float data
    gl.FLOAT,
    null,
  )

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  // console.log(texture)
  // console.log(renderTexture1.baseTexture)
  // renderTexture1.baseTexture = texture
  // renderTexture2.baseTexture = texture

  let currentTexture = renderTexture1
  const getCurrentRenderTexture = () => currentTexture
  const getNextRenderTexture = () =>
    currentTexture === renderTexture1 ? renderTexture2 : renderTexture1

  const particleGraphics: Graphics[] = particlesT0.map(() =>
    createParticleGraphic(config),
  )

  const geometry = new PIXI.Geometry()
    .addAttribute(
      'aPosition',
      [
        // x y
        [-1, -1],
        // x y
        [1, -1],
        // x y
        [-1, 1],
        // x y
        [1, 1],
      ]
        .map(([x, y]) => [(x * dimensions.x) / 2, (y * dimensions.y) / 2])
        .flat(),
      2,
    )
    .addAttribute(
      'aUv',
      [
        // x y
        0, 0,
        // x y
        1, 0,
        // x y
        0, 1,
        // x y
        1, 1,
      ],
      2,
    )
    .addIndex([0, 1, 2, 1, 2, 3])
  const shader = PIXI.Shader.from(vertex, fragment, {
    particle: [0, 0],
    particlesCount: 0,
    particles: new Array(maxParticles * 2).fill(0),
  })
  const particlesMesh = new PIXI.Mesh(geometry, shader)
  const timeFilter = new PIXI.Filter(undefined, timeSmoothFragment)
  timeFilter.uniforms.previousTexture = getNextRenderTexture()
  particlesMesh.filters = [timeFilter]

  const sprite = new Sprite(getCurrentRenderTexture())
  sprite.position.set(0, 0)
  sprite.anchor.set(0.5)
  rendererWorld.addChild(particlesMesh)

  world.addChild(sprite)
  shader.uniforms.particle = [dimensions.x / 2, dimensions.y / 2]
  shader.uniforms.particlesCount = 0

  const boundary = new Graphics()
  boundary.lineStyle(2, 0x333333) // Red color
  boundary.drawCircle(0, 0, mapRadius)

  world.addChild(boundary)

  particleGraphics.forEach((particle) => {
    // world.addChild(particle)
  })

  let kineticEnergy = 0

  const text = new Text('Kinetic Energy: 0 J', new TextStyle({ fill: 'white' }))
  app.stage.addChild(text)

  app.stage.addChild(world)

  app.ticker.add((time) => {
    const dt = time

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

    // buffer.setDataWithSize(
    //   new Float32Array(particlesT1.flatMap((p) => [p.pos.x, p.pos.y])),
    //   particlesT1.length * 2,
    //   true,
    // )

    shader.uniforms.particlesCount = Math.min(particlesT1.length, maxParticles)
    shader.uniforms.particles = new Float32Array(
      particlesT1.flatMap((p) => [p.pos.x, p.pos.y]),
    )

    shader.uniforms.particle = [particlesT0[0].pos.x, particlesT0[0].pos.y]

    timeFilter.uniforms.uCurrentRenderTexture = getCurrentRenderTexture()
    app.renderer.render(rendererWorld, {
      renderTexture: getNextRenderTexture(),
    })
    sprite.texture = getNextRenderTexture()
    currentTexture = getNextRenderTexture()

    const tmp = particlesT0
    particlesT0 = particlesT1
    particlesT1 = tmp
  })

  return {
    destroy: () => {
      root.removeChild(canvas)
      app.destroy()
    },
    setConfig: (newConfig: ParticleConfig) => {
      config = newConfig
      particlesT0.forEach((_, index) => {
        particleGraphics[index].scale = {
          x: config.particleRadius,
          y: config.particleRadius,
        }
      })
    },
  }
}

const maxParticles = 512

// const particlesBuffer = new PIXI.Buffer({
//   data: new Float32Array(new Array(maxParticles * 2).fill(0)),
//   usage: PIXI.BufferUsage.UNIFORM,
// })

// const particleResource = new BufferResource({
//   buffer: particlesBuffer,
//   size: maxParticles * 2,
// })
