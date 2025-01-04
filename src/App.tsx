import './App.css'
import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ParticleConfig,
  createGame,
  forceFromParticle,
  Game,
  Particle,
  Scenario,
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
  object,
  parseNumber,
  parseString,
  withDefault,
} from 'pure-parse'
import { HexColorPicker } from 'react-colorful'

export const Chart: FunctionComponent<{ config: ParticleConfig }> = (props) => {
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
  scenario: Scenario
}

type ConfigStorage = {
  configs: NamedConfig[]
}

const defaultParticleCount = 100

const parseParticleConfig = object<ParticleConfig>({
  uid: parseString,
  color: parseString,
  particleCount: withDefault(parseNumber, defaultParticleCount),
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

const parseScenario = object<Scenario>({
  particles: array(parseParticleConfig),
})

const parseNamedConfig = object<NamedConfig>({
  name: parseString,
  id: parseString,
  scenario: parseScenario,
})

const parseConfigStorage = object<ConfigStorage>({
  configs: array(parseNamedConfig),
})

const createDefaultParticle = (): ParticleConfig => ({
  uid: v4(),
  color: '#ffffff',
  particleCount: defaultParticleCount,
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

function App() {
  const [showChart, setShowChart] = useState(false)
  const game = useRef<Game | undefined>(undefined)
  const [newConfigName, setNewConfigName] = useState('')

  const [configStorageUnkown, saveConfigStorageUnknown] =
    useLocalStorage<unknown>('configStorage', {
      configs: [],
    })

  const [scenario, setScenario] = useState<Scenario>({
    particles: [createDefaultParticle()],
  })

  const [currentParticleUid, setCurrentParticleUid] = useState(
    scenario.particles[0].uid,
  )

  // TODO Remove non-null assertion
  const config = scenario.particles.find((it) => it.uid === currentParticleUid)!

  const setConfig =
    (uid: string): Dispatch<SetStateAction<ParticleConfig>> =>
    (getNewState) => {
      if (typeof getNewState === 'function') {
        setScenario((prevScenario) => {
          const newParticleConfig = getNewState(
            prevScenario.particles.find((it) => it.uid === uid)!,
          )
          const unaltered = prevScenario.particles.filter(
            (it) => it.uid !== uid,
          )
          return {
            particles: [...unaltered, newParticleConfig],
          }
        })
      } else {
        throw new Error('Do not even try')
      }
    }

  const rightEl = useRef<HTMLDivElement>(null)

  useAsyncEffect(
    () =>
      rightEl.current
        ? createGame(rightEl.current, config.particleCount, config)
        : Promise.resolve(undefined),
    (createdGame) => {
      game.current = createdGame
    },
    (createdGame) => {
      createdGame?.destroy()
    },
    [config.particleCount],
  )

  useEffect(() => {
    game.current?.setConfig(config)
  }, [config])

  const configStorageResult = parseConfigStorage(configStorageUnkown)

  const configStorage: ConfigStorage =
    configStorageResult.tag === 'success'
      ? configStorageResult.value
      : { configs: [] }

  const handelAddNewParticle = () => {
    setScenario((scenario) => {
      return {
        ...scenario,
        particles: [...scenario.particles, createDefaultParticle()],
      }
    })
  }

  return (
    <div className="app">
      <div className="left">
        <button onClick={() => setShowChart(!showChart)}>
          Toggle chart : {showChart ? 'True' : 'False'}
        </button>

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
                    alert('FAILED TO PARSEEEEEEEEEEaEEEE')
                    return
                  }

                  return {
                    configs: [
                      { name: newConfigName, id: v4(), scenario: scenario },
                      ...result.value.configs,
                    ],
                  } satisfies ConfigStorage
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
                {namedConfig.name}
                <button onClick={(e) => setScenario(namedConfig.scenario)}>
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
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {scenario.particles.map((particleConfig) => (
            <button
              style={{
                backgroundColor:
                  currentParticleUid === particleConfig.uid
                    ? 'lightgrey'
                    : undefined,
              }}
              onClick={() => {
                setCurrentParticleUid(particleConfig.uid)
              }}
            >
              <div
                style={{
                  width: 25,
                  height: 25,
                  background: particleConfig.color,
                  borderRadius: 5,
                  borderStyle: 'solid',
                  borderColor: 'black',
                  borderWidth: 2,
                }}
              ></div>
            </button>
          ))}
          <button onClick={handelAddNewParticle}>+Particle</button>
        </div>
        <ParticleConfigView
          config={config}
          setConfig={setConfig(currentParticleUid)}
        />
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

type ParticleConfigViewProps = {
  config: ParticleConfig
  setConfig: Dispatch<SetStateAction<ParticleConfig>>
}

const ParticleConfigView = (props: ParticleConfigViewProps) => {
  const { config, setConfig } = props

  return (
    <div>
      <h3>Particle Count</h3>

      <Input
        value={config.particleCount}
        onChange={(newValue: number) => {
          setConfig((config) => {
            return {
              ...config,
              particleCount: newValue,
            }
          })
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
        step={0.01}
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

      <HexColorPicker
        style={{ padding: 20 }}
        color={config.color}
        onChange={(newValue) => {
          setConfig((config) => {
            return {
              ...config,
              color: newValue,
            }
          })
        }}
      />
    </div>
  )
}

export default App
