import { Application, Assets, Container, Graphics } from "pixi.js"
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

type Particle = {
  graphics: Graphics
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
  // redDot.anchor.set(0.5);
  // redDot.scale.set(0.5);
  return redDot
}

type Config = {
  charge: number
  springCoeff: number
  airResistanceCoeff: number
  springDampingCoeff: number
  particleRadius: number
  mass: number
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

  const particles: Particle[] = Array.from({ length: particleCount }).map(
    () => ({
      graphics: createParticleGraphic(config),
      pos: randomInCircle(mapRadius),
      vel: randomInCircle(1),
      // vel: { x: 0, y: 0 },
    }),
  )

  const boundary = new Graphics()
  boundary.stroke(0x333333) // Red color
  boundary.circle(0, 0, mapRadius)
  boundary.stroke()
  world.addChild(boundary)

  particles.forEach((particle) => {
    world.addChild(particle.graphics)
  })

  app.stage.addChild(world)

  // const bunny = new Sprite(texture);

  // Listen for animate update
  app.ticker.add((time) => {
    const dt = time.deltaTime

    // Just for fun, let's rotate mr rabbit a little.
    // * Delta is 1 if running at 100% performance *
    // * Creates frame-independent transformation *
    particles.forEach((particle) => {
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

          const r = sub(particle.pos, otherParticle.pos)
          const rLen = length(r)
          const rNorm = div(r, rLen)

          if (rLen > config.particleRadius * 2) {
            const forceMagnitude =
              config.charge /
              Math.max(lengthSq(r), (config.particleRadius * 0.01) ** 2)

            const deltaForce = mult(rNorm, forceMagnitude)
            force.x += deltaForce.x
            force.y += deltaForce.y
          } else {
            const relV = sub(particle.vel, otherParticle.vel)
            const dxdt = dot(relV, rNorm)
            const damping = mult(rNorm, -dxdt * config.springDampingCoeff)
            const forceSpringLen =
              (config.particleRadius * 2 - rLen) * config.springCoeff
            const forceSpring = add(mult(rNorm, forceSpringLen), damping)

            force.x += forceSpring.x
            force.y += forceSpring.y
          }
          return force
        },
        { x: 0, y: 0 },
      )
      const force = sum(fieldForce, otherParticleForce, airResistance)

      const acc = div(force, config.mass)

      particle.vel.x += dt * acc.x
      particle.vel.y += dt * acc.y

      particle.pos.x += dt * particle.vel.x
      particle.pos.y += dt * particle.vel.y

      particle.graphics.position.copyFrom(particle.pos)
    })
  })
  return {
    destroy: () => {
      root.removeChild(app.canvas)
      app.destroy()
    },
    setConfig: (newConfig: Config) => {
      config = newConfig
      particles.forEach((particle) => {
        particle.graphics.scale = config.particleRadius
      })
    },
  }
}
