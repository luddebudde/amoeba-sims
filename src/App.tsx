import './App.css'
import {
  Dispatch,
  MouseEventHandler,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ParticleType,
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
import { origin, Vec } from './vec.ts'

export const Chart = (props: {
  scenario: Scenario
  particleType: ParticleType
}) => {
  const { scenario, particleType } = props
  const thisParticle: Particle = {
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    type: particleType.uid,
  }
  const xs = Array.from({ length: 100 }, (_, i) => i / 5)

  // {
  //   x: x,
  //   y: forceFromParticle(
  //     {
  //       pos: { x: x, y: 0 },
  //       vel: { x: 0, y: 0 },
  //       type: particleType.uid,
  //     },
  //     otherParticle,
  //     scenario,
  //   ).x,
  // }
  const data = xs.map((x) =>
    Object.fromEntries([
      ['x', x],
      ...scenario.particles.map((otherParticleType) => [
        otherParticleType.uid,
        -forceFromParticle(
          thisParticle,
          {
            pos: { x: x, y: 0 },
            vel: { x: 0, y: 0 },
            type: otherParticleType.uid,
          },
          scenario,
        ).x,
      ]),
    ]),
  )
  // const minMax = {
  //   min: -0.1,
  //   max: 0.1,
  // }
  return (
    <ResponsiveContainer
      width="100%"
      height={400}
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis
        // dataKey={particleType.uid}
        // {...minMax}
        />
        {scenario.particles.map((particleType) => (
          <Line
            type="monotone"
            dataKey={particleType.uid}
            stroke={particleType.color}
            dot={false}
            isAnimationActive={false}
          />
        ))}
        <ReferenceLine
          y={0}
          label="Max"
          stroke="black"
        />
        <ReferenceLine
          x={particleType.particleRadius}
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

const createDefaultParticle = (): ParticleType => ({
  uid: v4(),
  color: '#ffffff',
  particleCount: defaultParticleCount,
  airResistanceCoeff: 0,
  k1: 0,
  k2: 0,
  charge: 0,
  maxAbs: 1,
  mass: 1,
  particleRadius: 5,
  rOffset: 0,
  rScale: 1,
  springDampingCoeff: 0,
})

const createDefaultMouseParticle = (): ParticleType => ({
  uid: v4(),
  color: '#ffffff',
  particleCount: defaultParticleCount,
  airResistanceCoeff: 0,
  k1: 0,
  k2: 100,
  charge: 0,
  maxAbs: 1,
  mass: 1,
  particleRadius: 5,
  rOffset: 0,
  rScale: 1,
  springDampingCoeff: 0,
})

const createDefaultScenario = (): Scenario => ({
  particles: [createDefaultParticle()],
  mouseParticle: createDefaultMouseParticle(),
  shared: {
    colorStrength: 0.01,
    tailFade: 0.01,
    gravitationalConstant: 1,
    permettivityInverse: 100,
    permeability: 0,
    maxForceDist: 10000,
    timeScale: 1,
  },
})

const defaultParticleCount = 100

const parseParticleConfig = object<ParticleType>({
  uid: parseString,
  color: parseString,
  particleCount: withDefault(parseNumber, defaultParticleCount),
  airResistanceCoeff: parseNumber,
  k1: parseNumber,
  k2: parseNumber,
  charge: parseNumber,
  mass: parseNumber,
  maxAbs: withDefault(parseNumber, 1),
  particleRadius: parseNumber,
  rOffset: parseNumber,
  rScale: parseNumber,
  springDampingCoeff: parseNumber,
})

const parseScenario = object<Scenario>({
  particles: array(parseParticleConfig),
  mouseParticle: withDefault(parseParticleConfig, createDefaultMouseParticle()),
  shared: object({
    colorStrength: parseNumber,
    tailFade: parseNumber,
    gravitationalConstant: parseNumber,
    permettivityInverse: parseNumber,
    permeability: parseNumber,
    maxForceDist: withDefault(parseNumber, 1000),
    timeScale: withDefault(parseNumber, 1),
  }),
})

const parseNamedConfig = object<NamedConfig>({
  name: parseString,
  id: parseString,
  scenario: parseScenario,
})

const parseConfigStorage = object<ConfigStorage>({
  configs: array(parseNamedConfig),
})
function App() {
  const [restartKey, setRestartKey] = useState(0)
  const [showChart, setShowChart] = useState(false)
  const game = useRef<Game | undefined>(undefined)
  const [newConfigName, setNewConfigName] = useState('')

  const [configStorageUnkown, saveConfigStorageUnknown] =
    useLocalStorage<unknown>('configStorage', {
      configs: [],
    })

  const [scenario, setScenario] = useState<Scenario>(createDefaultScenario)

  const [currentParticleUid, setCurrentParticleUid] = useState(
    scenario.particles[0].uid,
  )

  const canvasEl = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState<Vec>(origin)

  const handleMouseMove: MouseEventHandler = (e) => {
    if (!canvasEl.current) {
      return
    }
    const rect = canvasEl.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePos({
      x: x - rect.width / 2,
      y: y - rect.height / 2,
    })
  }

  const currentParticle =
    scenario.particles.find((it) => it.uid === currentParticleUid) ??
    scenario.mouseParticle

  const setParticleType =
    (uid: string): Dispatch<SetStateAction<ParticleType>> =>
    (getNewState) => {
      if (typeof getNewState === 'function') {
        setScenario((prevScenario) => {
          const particleType = prevScenario.particles.find(
            (it) => it.uid === uid,
          )
          if (!particleType) {
            return {
              ...prevScenario,
              mouseParticle: getNewState(scenario.mouseParticle),
            }
          }
          const newParticleConfig = getNewState(particleType)
          const unaltered = prevScenario.particles.filter(
            (it) => it.uid !== uid,
          )
          return {
            ...prevScenario,
            particles: [newParticleConfig, ...unaltered],
          }
        })
      } else {
        throw new Error('Do not even try')
      }
    }

  useAsyncEffect(
    () =>
      canvasEl.current
        ? createGame(canvasEl.current, scenario)
        : Promise.resolve(undefined),
    (createdGame) => {
      game.current = createdGame
    },
    (createdGame) => {
      createdGame?.destroy()
    },
    // TODO replace this with a button
    [restartKey],
  )

  useEffect(() => {
    game.current?.setScenario(scenario)
  }, [scenario])

  useEffect(() => {
    game.current?.setMousePos(mousePos)
  }, [mousePos])

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
        <button
          onClick={() => {
            setRestartKey((i) => i + 1)
          }}
        >
          RESTART
        </button>
        {restartKey}

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
            <Chart
              scenario={scenario}
              particleType={currentParticle}
            />
          </div>
        )}

        <div>
          <div>
            <input
              onChange={(e) => setNewConfigName(e.currentTarget.value)}
              value={newConfigName}
            />
            <button
              onClick={(_e) =>
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
          </div>

          <div>
            {configStorage?.configs.map((namedConfig) => (
              <div>
                {namedConfig.name}
                <button
                  onClick={(_e) => {
                    setScenario(namedConfig.scenario)
                    setCurrentParticleUid(namedConfig.scenario.particles[0].uid)
                  }}
                >
                  Load
                </button>
                <button
                  onClick={(_e) =>
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
          <ParticleButton
            color={scenario.mouseParticle.color}
            enabled={currentParticle.uid === scenario.mouseParticle.uid}
            onClick={() => {
              setCurrentParticleUid(scenario.mouseParticle.uid)
            }}
          ></ParticleButton>

          {scenario.particles.map((particleConfig) => (
            <ParticleButton
              color={particleConfig.color}
              enabled={currentParticle.uid === particleConfig.uid}
              onClick={() => {
                setCurrentParticleUid(particleConfig.uid)
              }}
            ></ParticleButton>
          ))}
          <button onClick={handelAddNewParticle}>+Particle</button>
        </div>
        <ParticleConfigView
          config={currentParticle}
          setConfig={setParticleType(currentParticle.uid)}
        />

        <h3>Color Strength</h3>
        <Input
          value={scenario.shared.colorStrength}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  colorStrength: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={0.1}
          step={0.01}
        />

        <h3>Tail Lenght</h3>
        <Input
          value={scenario.shared.tailFade}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  tailFade: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={1}
          step={0.001}
        />

        <h3>G force</h3>
        <Input
          value={scenario.shared.gravitationalConstant}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  gravitationalConstant: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={10}
          step={0.001}
        />

        <h3>Inverted Permettivity (electric)</h3>
        <Input
          value={scenario.shared.permettivityInverse}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  permettivityInverse: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={500}
          step={1}
        />

        <h3>Permeability (magnetic)</h3>
        <Input
          value={scenario.shared.permeability}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  permeability: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={500}
          step={0.1}
        />

        <h3>Max force distance </h3>
        <p style={{ margin: 0 }}>For optimization</p>
        <Input
          value={scenario.shared.maxForceDist}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  maxForceDist: newValue,
                },
              }
            })
          }}
          min={0.0}
          max={1000}
          step={1}
        />

        <h3>Time Speed</h3>
        <p style={{ margin: 0 }}>Slow/speed up</p>
        <Input
          value={scenario.shared.timeScale}
          onChange={(newValue: number) => {
            setScenario((scenario) => {
              return {
                ...scenario,
                shared: {
                  ...scenario.shared,
                  timeScale: newValue,
                },
              }
            })
          }}
          min={-1}
          max={1}
          step={0.1}
        />
      </div>

      <div
        className="right"
        onMouseMove={handleMouseMove}
        ref={canvasEl}
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

type ParticleButtonProps = {
  color: string
  enabled: boolean
  onClick: () => void
}

const ParticleButton = (props: ParticleButtonProps) => {
  const { color, enabled, onClick } = props

  return (
    <button
      style={{
        backgroundColor: enabled ? 'lightgrey' : undefined,
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: 25,
          height: 25,
          background: color,
          borderRadius: 5,
          borderStyle: 'solid',
          borderColor: 'black',
          borderWidth: 2,
        }}
      ></div>
    </button>
  )
}

type ParticleConfigViewProps = {
  config: ParticleType
  setConfig: Dispatch<SetStateAction<ParticleType>>
}

const ParticleConfigView = (props: ParticleConfigViewProps) => {
  const { config: particleType, setConfig } = props

  return (
    <div>
      <h3>Particle Count</h3>

      <Input
        value={particleType.particleCount}
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
        value={particleType.rOffset}
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
        value={particleType.rScale}
        onChange={(newValue: number) => {
          setConfig((config) => {
            return {
              ...config,
              rScale: newValue,
            }
          })
        }}
        min={0.001}
        max={10}
        step={0.001}
      />

      <h3>Near distance repulsion</h3>

      <Input
        value={particleType.k1}
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

      <h3>Graviation mass</h3>
      <Input
        value={particleType.k2}
        onChange={(newValue: number) => {
          setConfig((config) => {
            return {
              ...config,
              k2: newValue,
            }
          })
        }}
        min={0}
        max={10}
        step={0.01}
      />

      <h3>Charge</h3>
      <Input
        value={particleType.charge}
        onChange={(newValue: number) => {
          setConfig((config) => {
            return {
              ...config,
              charge: newValue,
            }
          })
        }}
        min={-1}
        max={1}
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
        value={particleType.maxAbs}
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
        value={particleType.airResistanceCoeff}
        onChange={(newValue: number) => {
          setConfig((config) => {
            return {
              ...config,
              airResistanceCoeff: newValue,
            }
          })
        }}
        min={0}
        max={0.1}
        step={0.001}
      />

      <h3>Spring Damping Coefficient</h3>

      <Input
        value={particleType.springDampingCoeff}
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

      <h3>Particle Radius</h3>

      <Input
        value={particleType.particleRadius}
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
        value={particleType.mass}
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
        color={particleType.color}
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
