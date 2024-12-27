import './App.css'
import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Config,
  createGame,
  forceFromParticle,
  Game,
  Particle,
} from './game.ts'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { useLocalStorage } from '@uidotdev/usehooks'
import { v4 } from 'uuid'

export const Chart: FunctionComponent<{ config: Config }> = (props) => {
  const { config } = props
  const otherParticle: Particle = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
  }
  const xs = Array.from({ length: 100 }, (_, i) => i / 5)
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
    <ResponsiveContainer
      width="100%"
      height={400}
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis
          dataKey="y"
          {...minMax}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="red"
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine
          y={0}
          label="Max"
          stroke="black"
        />
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
          tag: 'pending'
        }
      | {
          tag: 'done'
          data: T
        }
      | {
          tag: 'aborted'
        } = {
      tag: 'pending',
    }
    task().then((data) => {
      switch (state.tag) {
        case 'pending': {
          state = {
            tag: 'done',
            data,
          }
          onComplete(data)
          break
        }
        case 'done': {
          // Should not happen
          break
        }
        case 'aborted': {
          cleanup(data)
          break
        }
      }
    })
    return () => {
      switch (state.tag) {
        case 'pending': {
          state = {
            tag: 'aborted',
          }
          break
        }
        case 'done': {
          cleanup(state.data)
          break
        }
        case 'aborted': {
          // Should not happen
          break
        }
      }
    }
  }, dependencies)
}

type NamedConfig = {
  name: string
  id: string
  config: Config
}

type ConfigStorage = {
  configs: NamedConfig[]
}

function App() {
  const [particleCount, setParticleCount] = useState(100)
  const [showChart, setShowChart] = useState(false)
  const game = useRef<Game | undefined>(undefined)
  const [newConfigName, setNewConfigName] = useState('')

  const [configStorage, saveConfigStorage] = useLocalStorage<ConfigStorage>(
    'configStorage',
    {
      configs: [],
    },
  )

  const [config, setConfig] = useState<Config>({
    airResistanceCoeff: 0,
    k1: 0,
    k2: 0,
    mass: 1,
    particleRadius: 5,
    rOffset: 0,
    rScale: 1,
    springCoeff: 0,
    springDampingCoeff: 0,
  })

  const rightEl = useRef<HTMLDivElement>(null)

  useAsyncEffect(
    () =>
      rightEl.current
        ? createGame(rightEl.current, particleCount, config)
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
    game.current?.setConfig(config)
  }, [config])

  return (
    <div className="app">
      <div className="left">
        <button onClick={() => setShowChart(!showChart)}>
          Toggle chart : {showChart ? 'True' : 'False'}
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
          min={-5}
          max={5}
          step={0.001}
          value={config.rOffset}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                rOffset: value,
              }
            })
          }}
        />
        <div>{config.rOffset}</div>

        <h3>r scale</h3>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={config.rScale}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                rScale: value,
              }
            })
          }}
        />
        <div>{config.rScale}</div>

        <h3>Near distance repulsion</h3>
        <input
          type="range"
          min={-3}
          max={3}
          step={0.01}
          value={config.k1}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                k1: value,
              }
            })
          }}
        />
        <div>{config.k1}</div>

        <h3>Graviation constant</h3>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={config.k2}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                k2: value,
              }
            })
          }}
        />
        <div>{config.k2}</div>
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
          value={config.airResistanceCoeff}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                airResistanceCoeff: value,
              }
            })
          }}
        />
        <div>{config.airResistanceCoeff}</div>

        <h3>Spring Coefficient</h3>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.001}
          value={config.springCoeff}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                springCoeff: value,
              }
            })
          }}
        />
        <div>{config.springCoeff}</div>

        <h3>Spring Damping Coefficient</h3>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.0001}
          value={config.springDampingCoeff}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                springDampingCoeff: value,
              }
            })
          }}
        />
        <div>{config.springDampingCoeff}</div>

        <button
          onClick={() => {
            setConfig((config) => {
              return {
                ...config,
                springDampingCoeff:
                  2 * Math.sqrt(config.springCoeff * config.mass),
              }
            })
          }}
        >
          Critical: {2 * Math.sqrt(config.springCoeff * config.mass)}
        </button>

        <h3>Particle Radius</h3>
        <input
          type="range"
          min={1}
          max={15}
          step={1}
          value={config.particleRadius}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                particleRadius: value,
              }
            })
          }}
        />
        <div>{config.particleRadius}</div>

        <h3>Particle Mass</h3>
        <input
          type="range"
          min={0.1}
          max={10}
          step={0.01}
          value={config.mass}
          onChange={(e) => {
            const value = Number(e.currentTarget.value)
            setConfig((config) => {
              return {
                ...config,
                mass: value,
              }
            })
          }}
        />
        <div>{config.mass}</div>

        {showChart && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '500px',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'stretch',
              backgroundColor: 'white',
              padding: '5px',
              boxSizing: 'border-box',
              borderLeft: '1px solid lightgray',
            }}
          >
            <Chart config={config} />
          </div>
        )}

        <div>
          <div>
            <input
              onChange={(e) => setNewConfigName(e.currentTarget.value)}
              value={newConfigName}
            />
            <button
              onClick={(e) =>
                saveConfigStorage((configStorage) => {
                  return {
                    configs: [
                      { name: newConfigName, id: v4(), config: config },
                      ...configStorage.configs,
                    ],
                  }
                })
              }
            >
              Save
            </button>
            <button
              onClick={(e) =>
                saveConfigStorage((configStorage) => {
                  return {
                    configs: [],
                  }
                })
              }
            >
              delete all
            </button>
          </div>

          <div>
            {configStorage?.configs.map((namedConfig) => (
              <div>
                {namedConfig.name}{' '}
                <button onClick={(e) => setConfig(namedConfig.config)}>
                  Load
                </button>
                <button
                  onClick={(e) =>
                    saveConfigStorage((configStorage) => {
                      return {
                        configs: configStorage.configs.filter(
                          (it) => it.id !== namedConfig.id,
                        ),
                      }
                    })
                  }
                >
                  supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="right"
        ref={rightEl}
      ></div>
    </div>
  )
}

export default App
