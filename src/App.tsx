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
import {
  array,
  failure,
  object,
  parseNumber,
  parseString,
  withDefault,
} from 'pure-parse'
import parse from 'parse-svg-path'

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

const parseConfig = object<Config>({
  airResistanceCoeff: parseNumber,
  k1: parseNumber,
  k2: parseNumber,
  mass: parseNumber,
  maxAbs: withDefault(parseNumber, 1),
  particleRadius: parseNumber,
  rOffset: parseNumber,
  rScale: parseNumber,
  springCoeff: parseNumber,
  springDampingCoeff: parseNumber,
})

const parseNamedConfig = object<NamedConfig>({
  name: parseString,
  id: parseString,
  config: parseConfig,
})

const parseConfigStorage = object<ConfigStorage>({
  configs: array(parseNamedConfig),
})

function App() {
  const [particleCount, setParticleCount] = useState(100)
  const [showChart, setShowChart] = useState(true)
  const game = useRef<Game | undefined>(undefined)
  const [newConfigName, setNewConfigName] = useState('')

  const [configStorageUnkown, saveConfigStorageUnknown] =
    useLocalStorage<unknown>('configStorage', {
      configs: [],
    })

  const [config, setConfig] = useState<Config>({
    airResistanceCoeff: 0,
    k1: 0,
    k2: 0,
    maxAbs: 1,
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

  const configStorageResult = parseConfigStorage(configStorageUnkown)

  if (configStorageResult.tag === 'failure') {
    return 'Could not parse config storage lolololol'
  }

  const configStorage = configStorageResult.value

  return (
    <div className="app">
      <div className="left">
        <button onClick={() => setShowChart(!showChart)}>
          Toggle chart : {showChart ? 'True' : 'False'}
        </button>

        <h3>Particle Count</h3>

        <Input
          value={particleCount}
          onChange={(newValue: number) => {
            setParticleCount(newValue)
          }}
          min={0}
          max={1000}
          step={1}
        />

        <h3>r offset</h3>

        <Input
          value={config.rOffset}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                rOffset: newValue,
              }
            })
          }}
          min={-5}
          max={5}
          step={0.001}
        />

        <h3>r scale</h3>
        <Input
          value={config.rScale}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                rScale: newValue,
              }
            })
          }}
          min={0}
          max={10}
          step={0.001}
        />

        <h3>Near distance repulsion</h3>

        <Input
          value={config.k1}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                k1: newValue,
              }
            })
          }}
          min={-3}
          max={3}
          step={0.01}
        />

        <h3>Graviation constant</h3>

        <Input
          value={config.k2}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                k2: newValue,
              }
            })
          }}
          min={-10}
          max={10}
          step={0.1}
        />

        <pre>
          <code>
            {` 
rPlus = rScale * rAbs + rOffset 
force = k1 / rPlus ** 3 + k2 / rPlus ** 2`}
          </code>
        </pre>

        <h3>Max force</h3>

        <Input
          value={config.maxAbs}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                maxAbs: newValue,
              }
            })
          }}
          min={0}
          max={1}
          step={0.01}
        />

        <h3>Air Coefficient</h3>

        <Input
          value={config.airResistanceCoeff}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                airResistanceCoeff: newValue,
              }
            })
          }}
          min={-10}
          max={10}
          step={0.01}
        />

        <h3>Spring Coefficient</h3>

        <Input
          value={config.springCoeff}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                springCoeff: newValue,
              }
            })
          }}
          min={0}
          max={0.1}
          step={0.001}
        />

        <h3>Spring Damping Coefficient</h3>

        <Input
          value={config.springDampingCoeff}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                springDampingCoeff: newValue,
              }
            })
          }}
          min={0}
          max={0.1}
          step={0.0001}
        />

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

        <Input
          value={config.particleRadius}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                particleRadius: newValue,
              }
            })
          }}
          min={1}
          max={15}
          step={1}
        />

        <h3>Particle Mass</h3>

        <Input
          value={config.mass}
          onChange={(newValue: number) => {
            setConfig((config) => {
              return {
                ...config,
                mass: newValue,
              }
            })
          }}
          min={0.1}
          max={10}
          step={0.01}
        />

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
                saveConfigStorageUnknown((configStorage: unknown) => {
                  const result = parseConfigStorage(configStorage)

                  if (result.tag === 'failure') {
                    alert('FAILED TO PARSEEEEEEEEEEEEEE')
                    return
                  }

                  return {
                    configs: [
                      { name: newConfigName, id: v4(), config: config },
                      ...result.value.configs,
                    ],
                  }
                })
              }
            >
              Save
            </button>
            <button
              onClick={(e) =>
                saveConfigStorageUnknown((configStorage: unknown) => {
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
                    saveConfigStorageUnknown((configStorage: unknown) => {
                      const result = parseConfigStorage(configStorage)

                      if (result.tag === 'failure') {
                        alert('FAILED TO PARSEEEEEEEEEEEEEE')
                        return
                      }
                      return {
                        configs: result.value.configs.filter(
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

const Input = (props: {
  value: number
  onChange: (newValue: number) => void
  min: number
  max: number
  step: number
}) => {
  return (
    <div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => {
          const newValue = Number(e.currentTarget.value)
          props.onChange(newValue)
        }}
      />
      <input
        type="number"
        value={props.value}
        step={props.step}
        onChange={(e) => {
          const newValue = Number(e.currentTarget.value)
          props.onChange(newValue)
        }}
      />
    </div>
  )
}

export default App
