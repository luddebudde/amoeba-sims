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
  ReferenceLine,
} from "recharts"

export const Chart: FunctionComponent<{ config: Config }> = (props) => {
  const { config } = props
  const otherParticle: Particle = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
  }
  const xs = Array.from({ length: 100 }, (_, i) => i / 10)
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
  const minMax = {
    min: -0.1,
    max: 0.1,
  }
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis dataKey="y" {...minMax} />
        <Line
          type="monotone"
          dataKey="y"
          stroke="red"
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine y={0} label="Max" stroke="black" />
        <ReferenceLine
          x={config.particleRadius}
          label="R"
          stroke="blue"
          strokeDasharray="3 3"
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
  const [k1, setK1] = useState(0)
  const [k2, setK2] = useState(0)
  const [springCoeff, setSpringCoeff] = useState(0.0)
  const [airResistanceCoeff, setAirResistanceCoeff] = useState(0)
  const [springDampingCoeff, setSpringDampingCoeff] = useState(0)
  const [particleRadius, setParticleRadius] = useState(5)
  const [mass, setMass] = useState(1)
  const [showChart, setShowChart] = useState(false)
  const [rOffset, setROffset] = useState(0)
  const [rScale, setRScale] = useState(1)
  const game = useRef<Game | undefined>(undefined)

  const rightEl = useRef<HTMLDivElement>(null)

  useAsyncEffect(
    () =>
      rightEl.current
        ? createGame(rightEl.current, particleCount, {
            rOffset,
            rScale,
            k1,
            k2,
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

  const config = useMemo<Config>(() => {
    return {
      rOffset,
      rScale,
      k1,
      k2,
      springCoeff,
      airResistanceCoeff,
      springDampingCoeff,
      particleRadius,
      mass,
    }
  }, [
    rOffset,
    rScale,
    k1,
    k2,
    springCoeff,
    airResistanceCoeff,
    springDampingCoeff,
    particleRadius,
    mass,
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

        <h3>r scale</h3>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={rScale}
          onChange={(e) => setRScale(Number(e.currentTarget.value))}
        />
        <div>{rScale}</div>

        <h3>k1</h3>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={k1}
          onChange={(e) => setK1(Number(e.currentTarget.value))}
        />
        <div>{k1}</div>

        <h3>k2</h3>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.1}
          value={k2}
          onChange={(e) => setK2(Number(e.currentTarget.value))}
        />
        <div>{k2}</div>
        <pre>
          <code>
            {` 
rPlus = rScale * rAbs + rOffset 
force = k1 / rPlus ** 3 + k2 / rPlus ** 2`}
          </code>
        </pre>

        <h3>Air Coefficient</h3>
        <input
          type="range"
          min={-10}
          max={10}
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
              top: 0,
              right: 0,
              width: "500px",
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "stretch",
              backgroundColor: "white",
              padding: "5px",
              boxSizing: "border-box",
              borderLeft: "1px solid lightgray",
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
