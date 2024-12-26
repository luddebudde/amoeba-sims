import "./App.css"
import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react"
import {
  Config,
  createGame,
  forceFromParticle,
  Game,
  Particle,
} from "./game.ts"
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

export const Chart: FunctionComponent<{ config: Config }> = (props) => {
  const { config } = props
  const otherParticle: Particle = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
  }
  const xs = Array.from({ length: 100 }, (_, i) => i + 1)
  const data = xs.map((x) => ({
    x: x,
    y: forceFromParticle(
      {
        pos: { x: x, y: 0 },
        vel: { x: 0, y: 0 },
      },
      otherParticle,
      config,
    ).x,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis dataKey="y" />
        <Line
          type="monotone"
          dataKey="y"
          stroke="red"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

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
  const [showChart, setShowChart] = useState(false)
  const [rOffset, setROffset] = useState(0)
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
            rOffset,
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

  const config = useMemo(() => {
    return {
      charge: particleCharge,
      springCoeff,
      airResistanceCoeff,
      springDampingCoeff,
      particleRadius,
      mass,
      rOffset,
    }
  }, [
    particleCharge,
    springCoeff,
    airResistanceCoeff,
    springDampingCoeff,
    particleRadius,
    mass,
    rOffset,
  ])

  useEffect(() => {
    console.log("Setting config", config)
    game.current?.setConfig(config)
  }, [config])

  return (
    <div className="app">
      <div className="left">
        <button onClick={() => setShowChart(!showChart)}>
          Toggle chart : {showChart ? "True" : "False"}
        </button>
        <h3>Particle Count</h3>
        <input
          type="range"
          min={0}
          max={1000}
          value={particleCount}
          onChange={(e) => setParticleCount(Number(e.currentTarget.value))}
        />
        <div>{particleCount}</div>
        <h3>r offset</h3>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={rOffset}
          onChange={(e) => setROffset(Number(e.currentTarget.value))}
        />
        <div>{rOffset}</div>

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
        {showChart && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: "100vw",
              height: "300px",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "white",
              padding: "10px",
              boxSizing: "border-box",
              borderTop: "1px solid lightgray",
            }}
          >
            <Chart config={config} />
          </div>
        )}
      </div>

      <div className="right" ref={rightEl}></div>
    </div>
  )
}

export default App
