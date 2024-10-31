export const normaliseProgressValue = (value: number, max = 500, min = 0) =>
  ((value - min) * 100) / (max - min)
