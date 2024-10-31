export const transformTextToWithDots = (text = '', letter = 4) => {
  if (!text) return null

  const firstPart = text.slice(0, letter+2)
  const lastPart = text.slice(text.length - letter, text.length + 1)
  return `${firstPart}...${lastPart}`
}
