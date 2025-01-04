export const hexToRgbArray = (
  hex: string,
): [number, number, number] | undefined => {
  if (hex[0] !== '#') {
    return undefined
  }

  if (hex.length !== 7) {
    return undefined
  }

  const r = parseInt(hex.substring(1, 3), 16)
  const g = parseInt(hex.substring(3, 5), 16)
  const b = parseInt(hex.substring(5, 7), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return undefined
  }

  return [r, g, b]
}
