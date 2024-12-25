import { Vec } from "./vec.ts"

export const randomInCircle = (radius: number): Vec => {
  const angle = Math.random() * Math.PI * 2
  const r = radius * Math.sqrt(Math.random())

  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  }
}
