export const range = function* (count: number, step: number, sample: number) {
  const side = Math.sqrt(count / sample)
  const xDimension = Math.ceil(side * step)
  const yDimension = Math.floor(side * step)
  let i = 0

  for (let x = -(xDimension / 2); x <= xDimension / 2; x += step) {
    for (let y = -(yDimension / 2); y <= yDimension / 2; y += step) {
      if (i >= count) {
        return
      }

      if (Math.random() > sample) {
        i++
        yield [x, y] as const
      }
    }
  }
}
