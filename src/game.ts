import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js'
import {
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
import fadeVertex from './fade.vert?raw'
import fadeFragment from './fade.frag?raw'
import timeSmoothFragment from './shaders/timeSmooth.frag?raw'
import { hexToRgbArray } from './hexToVec.ts'
import {
  clipForce,
  emField,
  emForce,
  gravityField,
  gravityForce,
} from './physcis.ts'

export type Game = Awaited<ReturnType<typeof createGame>>

export type Particle = {
  pos: Vec
  vel: Vec
  type: ParticleType['uid']
}

export type ParticleType = {
  uid: string
  color: string
  particleCount: number
  charge: number
  rOffset: number
  rScale: number
  k1: number
  k2: number
  maxAbs: number
  airResistanceCoeff: number
  springDampingCoeff: number
  particleRadius: number
  mass: number
}

type SharedConfig = {
  colorStrength: number
  tailFade: number
  gravitationalConstant: number
  permettivityInverse: number
  permeability: number
  maxForceDist: number
  timeScale: number
}

export type Scenario = {
  particles: ParticleType[]
  mouseParticle: ParticleType
  shared: SharedConfig
}

// TODO combine both springs
function dampingForce(
  thisParticle: Particle,
  otherParticle: Particle,
  config: ParticleType,
) {
  const r = sub(thisParticle.pos, otherParticle.pos)
  const rAbs = length(r)
  const rNorm = div(r, rAbs)

  const relV = sub(thisParticle.vel, otherParticle.vel)
  const dxdt = dot(relV, rNorm)
  return mult(rNorm, -dxdt * config.springDampingCoeff)
}

const findParticleType = (scenario: Scenario, uid: string) => {
  return (
    scenario.particles.find((it) => it.uid === uid) ?? scenario.mouseParticle
  )
}

export const forceFromParticle = (
  thisParticle: Particle,
  otherParticle: Particle,
  scenario: Scenario,
): Vec => {
  const thisType = findParticleType(scenario, thisParticle.type)
  const otherType = findParticleType(scenario, otherParticle.type)

  if (thisType === undefined || otherType === undefined) {
    // Something is wrong: cannot calculate the force
    return origin
  }

  const r = mult(sub(thisParticle.pos, otherParticle.pos), thisType.rScale)
  const rNorm2 = lengthSq(r)

  if (rNorm2 > scenario.shared.maxForceDist * scenario.shared.maxForceDist) {
    return origin
  }

  // If the particles are near each other, repel (1/dist**3)
  const nearRepulsionF = mult(r, thisType.k1 / (rNorm2 * rNorm2))

  const gravityF = gravityForce(
    thisType.mass,
    gravityField(-scenario.shared.gravitationalConstant, r, otherType.k2),
  )

  // If particles are overlapping, simulate loss of kinetic energy
  const dampingF =
    rNorm2 > thisType.particleRadius + otherType.particleRadius
      ? origin
      : dampingForce(thisParticle, otherParticle, thisType)

  const lorentzF = emForce(
    thisType.charge,
    thisParticle.vel,
    ...emField(
      1 / scenario.shared.permettivityInverse,
      scenario.shared.permeability,
      r,
      otherType.charge,
      otherParticle.vel,
    ),
  )

  const totalF = sum(nearRepulsionF, dampingF, gravityF, lorentzF)

  // Ensure that the force does not become too great
  return clipForce(totalF, thisType.maxAbs)
}

function calculateForce(
  particle: Particle,
  mapRadius: number,
  scenario: Scenario,
  particles: Particle[],
  mouseParticle: Particle,
) {
  const particleType = findParticleType(scenario, particle.type)
  if (particleType === undefined) {
    console.warn('COULD NOT FIND PARTICEL TYPE')
    return origin
  }
  const fieldR = sub(origin, particle.pos)
  const fieldRNorm = normalise(fieldR)

  const fieldForce =
    lengthSq(fieldR) > mapRadius * mapRadius
      ? mult(fieldRNorm, (length(fieldR) - mapRadius) * 0.001)
      : { x: 0, y: 0 }

  const airResistance = mult(particle.vel, -particleType.airResistanceCoeff)

  const otherParticleForce = particles.reduce(
    (force, otherParticle) => {
      if (particle === otherParticle) {
        return force
      }

      const f = forceFromParticle(particle, otherParticle, scenario)

      force.x += f.x
      force.y += f.y

      return force
    },
    { x: 0, y: 0 },
  )

  const mouseForce = forceFromParticle(particle, mouseParticle, scenario)

  return sum(fieldForce, otherParticleForce, airResistance, mouseForce)
}

export const createGame = async (
  root: HTMLElement,
  initialScenario: Scenario,
) => {
  let scenario = initialScenario
  let mousePos = origin

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

  const maxInitialVelocity = 1
  let particlesT0: Particle[] = scenario.particles
    .map((particleType) =>
      Array.from({ length: particleType.particleCount }).map(() => ({
        pos: randomInCircle(mapRadius),
        vel: randomInCircle(maxInitialVelocity),
        type: particleType.uid,
      })),
    )
    .flat()

  let particlesT1 = structuredClone(particlesT0)
  let particlesTHalf = structuredClone(particlesT0)

  const particleFloatBuffer = new Float32Array(512 * 512 * 4)

  const particleBaseTexture = PIXI.BaseTexture.fromBuffer(
    particleFloatBuffer,
    512,
    512,
    {
      format: PIXI.FORMATS.RGBA,
      type: PIXI.TYPES.FLOAT,
    },
  )

  const particleTexture = new PIXI.Texture(particleBaseTexture)

  const renderTextureOptions: PIXI.IBaseTextureOptions = {
    width: dimensions.x,
    height: dimensions.y,
    format: PIXI.FORMATS.RGBA,
    type: PIXI.TYPES.FLOAT,
  }
  const renderTexture1 = PIXI.RenderTexture.create(renderTextureOptions)
  const renderTexture2 = PIXI.RenderTexture.create(renderTextureOptions)

  let currentTexture = renderTexture1
  const getCurrentRenderTexture = () => currentTexture
  const getNextRenderTexture = () =>
    currentTexture === renderTexture1 ? renderTexture2 : renderTexture1

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

  // 2 for position
  // 2 for velocity
  // 3 for color

  const dotShader = PIXI.Shader.from(fadeVertex, fadeFragment, {
    dt: 0,
    particlesCount: 0,
    colorStrength: scenario.shared.colorStrength,
    permettivityInverse: scenario.shared.permettivityInverse,
    permeability: scenario.shared.permeability,
    uParticleTexture: particleTexture,
  })

  const particlesMesh = new PIXI.Mesh(geometry, dotShader)
  const timeFilter = new PIXI.Filter(undefined, timeSmoothFragment, {
    tailFade: scenario.shared.tailFade,
  })
  timeFilter.uniforms.previousTexture = getNextRenderTexture()
  particlesMesh.filters = [timeFilter]

  const sprite = new Sprite(getCurrentRenderTexture())
  sprite.position.set(0, 0)
  sprite.anchor.set(0.5)
  rendererWorld.addChild(particlesMesh)

  world.addChild(sprite)
  // dotShader.uniforms.particle = [dimensions.x / 2, dimensions.y / 2]
  // dotShader.uniforms.particlesCount = 0
  // dotShader.uniforms.colorStrength = scenario.shared.colorStrength

  const boundary = new Graphics()
  boundary.lineStyle(2, 0x333333) // Red color
  boundary.drawCircle(0, 0, mapRadius)

  world.addChild(boundary)

  let kineticEnergy = 0
  let fps = 0

  app.stage.addChild(world)

  const stats = new PIXI.Container()
  const energyText = new Text(
    'Kinetic Energy: 0 J',
    new TextStyle({ fill: 'white' }),
  )
  const fpsText = new Text('0 fps', new TextStyle({ fill: 'white' }))
  fpsText.y = 30
  stats.addChild(energyText)
  stats.addChild(fpsText)
  app.stage.addChild(stats)

  let timePrevious = performance.now()

  // app.ticker.maxFPS = 5

  app.ticker.add((time) => {
    const mouseParticle: Particle = {
      pos: mousePos,
      type: scenario.mouseParticle.uid,
      vel: origin,
    }

    const dt = time * scenario.shared.timeScale
    const timeNow = performance.now()
    const dt2 = timeNow - timePrevious
    timePrevious = timeNow
    fps = 0.95 * fps + (0.05 * 1000) / dt2

    kineticEnergy = particlesT0.reduce((acc, particle) => {
      const mass = findParticleType(scenario, particle.type)?.mass ?? 0
      return acc + 0.5 * mass * lengthSq(particle.vel)
    }, 0)

    energyText.text = `Kinetic Energy: ${kineticEnergy.toExponential(2)} J`
    fpsText.text = `${fps.toFixed(0)} fps`

    particlesT0.forEach((particleT0, index) => {
      const particleTHalf = particlesTHalf[index]
      const force = calculateForce(
        particleT0,
        mapRadius,
        scenario,
        particlesT0,
        mouseParticle,
      )

      const particleType = findParticleType(scenario, particleT0.type)

      if (particleType === undefined) {
        particleTHalf.vel = origin
        particleTHalf.pos = particleT0.pos
        return
      }

      const acc = div(force, particleType.mass)
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

      const particleType = findParticleType(scenario, particleT0.type)

      if (particleType === undefined) {
        particleT1.vel = origin
        return
      }

      const force = calculateForce(
        particleTHalf,
        mapRadius,
        scenario,
        particlesTHalf,
        mouseParticle,
      )

      const acc = div(force, particleType.mass)
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

    // buffer.setDataWithSize(
    //   new Float32Array(particlesT1.flatMap((p) => [p.pos.x, p.pos.y])),
    //   particlesT1.length * 2,
    //   true,
    // )

    const particlesToDraw = [...particlesT1, mouseParticle]
    const particlesData = particlesToDraw.flatMap((p) => {
      const particleType = findParticleType(scenario, p.type)
      const color =
        particleType === undefined
          ? [0, 1, 1]
          : (hexToRgbArray(particleType.color) ?? [1, 0, 0])

      return [
        p.pos.x,
        p.pos.y,
        p.vel.x,
        p.vel.y,
        ...color,
        particleType?.particleRadius ?? 0,
      ]
    })

    for (let i = 0; i < particleFloatBuffer.length; i++) {
      particleFloatBuffer[i] = particlesData[i]
    }

    particleBaseTexture.update()

    dotShader.uniforms.colorStrength = scenario.shared.colorStrength
    dotShader.uniforms.permettivityInverse = scenario.shared.permettivityInverse
    dotShader.uniforms.permeability = scenario.shared.permeability
    dotShader.uniforms.dt = dt
    dotShader.uniforms.particlesCount = Math.min(
      particlesToDraw.length,
      maxParticles,
    )

    timeFilter.uniforms.dt = dt
    timeFilter.uniforms.tailFade = scenario.shared.tailFade
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
    setScenario: (newScenario: Scenario) => {
      scenario = newScenario
    },
    setMousePos: (pos: Vec) => (mousePos = pos),
  }
}

const maxParticles = 1024
