import "./App.css"
import { useEffect, useRef, useState } from "react"
import { createGame, Game } from "./game.ts"

const useAsyncEffect = <T,>(
  task: () => Promise<T>,
  onComplete: (data: T) => void,
  cleanup: (data: T) => void,
  dependencies: unknown[],
) => {
  useEffect(() => {
    let state:
      | {
          tag: "pending"
        }
      | {
          tag: "done"
          data: T
        }
      | {
          tag: "aborted"
        } = {
      tag: "pending",
    }
    task().then((data) => {
      switch (state.tag) {
        case "pending": {
          state = {
            tag: "done",
            data,
          }
          onComplete(data)
          break
        }
        case "done": {
          // Should not happen
          break
        }
        case "aborted": {
          cleanup(data)
          break
        }
      }
    })
    return () => {
      switch (state.tag) {
        case "pending": {
          state = {
            tag: "aborted",
          }
          break
        }
        case "done": {
          cleanup(state.data)
          break
        }
        case "aborted": {
          // Should not happen
          break
        }
      }
    }
  }, dependencies)
}

function App() {
  const [particleCount, setParticleCount] = useState(100)
  const [particleCharge, setParticleCharge] = useState(0)
  const [springCoeff, setSpringCoeff] = useState(0.0)
  const [airResistanceCoeff, setAirResistanceCoeff] = useState(0)
  const [springDampingCoeff, setSpringDampingCoeff] = useState(0)
  const [particleRadius, setParticleRadius] = useState(5)
  const [mass, setMass] = useState(1)
  const game = useRef<Game | undefined>(undefined)

  const rightEl = useRef<HTMLDivElement>(null)

  useAsyncEffect(
    () =>
      rightEl.current
        ? createGame(rightEl.current, particleCount, {
            charge: particleCharge,
            springCoeff,
            airResistanceCoeff,
            springDampingCoeff,
            particleRadius,
            mass,
          })
        : Promise.resolve(undefined),
    (createdGame) => {
      game.current = createdGame
    },
    (createdGame) => {
      createdGame?.destroy()
    },
    [particleCount],
  )

  useEffect(() => {
    game.current?.setConfig({
      charge: particleCharge,
      springCoeff,
      airResistanceCoeff,
      springDampingCoeff,
      particleRadius,
      mass,
    })
  }, [
    airResistanceCoeff,
    particleCharge,
    particleRadius,
    springCoeff,
    springDampingCoeff,
    mass,
  ])

  return (
    <div className="app">
      <div className="left">
        <h3>Particle Count</h3>
        <input
          type="range"
          min={0}
          max={1000}
          value={particleCount}
          onChange={(e) => setParticleCount(Number(e.currentTarget.value))}
        />
        <div>{particleCount}</div>
        <h3>Particle Charge</h3>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={particleCharge}
          onChange={(e) => setParticleCharge(Number(e.currentTarget.value))}
        />
        <div>{particleCharge}</div>

        <h3>Air Coefficient</h3>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={airResistanceCoeff}
          onChange={(e) => setAirResistanceCoeff(Number(e.currentTarget.value))}
        />
        <div>{airResistanceCoeff}</div>

        <h3>Spring Coefficient</h3>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.001}
          value={springCoeff}
          onChange={(e) => setSpringCoeff(Number(e.currentTarget.value))}
        />
        <div>{springCoeff}</div>

        <h3>Spring Damping Coefficient</h3>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.0001}
          value={springDampingCoeff}
          onChange={(e) => setSpringDampingCoeff(Number(e.currentTarget.value))}
        />
        <div>{springDampingCoeff}</div>
        <button
          onClick={() => {
            setSpringDampingCoeff(2 * Math.sqrt(springCoeff * mass))
          }}
        >
          Critical: {2 * Math.sqrt(springCoeff * mass)}
        </button>

        <h3>Particle Radius</h3>
        <input
          type="range"
          min={1}
          max={15}
          step={1}
          value={particleRadius}
          onChange={(e) => setParticleRadius(Number(e.currentTarget.value))}
        />
        <div>{particleRadius}</div>

        <h3>Particle Mass</h3>
        <input
          type="range"
          min={0.1}
          max={10}
          step={0.01}
          value={mass}
          onChange={(e) => setMass(Number(e.currentTarget.value))}
        />
        <div>{mass}</div>
      </div>

      <div className="right" ref={rightEl}></div>
    </div>
  )
}

export default App
