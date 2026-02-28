const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array]
  let currentIndex = array.length
  while (currentIndex) {
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    const a = newArray[currentIndex]
    const b = newArray[randomIndex]
    if (a !== undefined && b !== undefined) {
      newArray[currentIndex] = b
      newArray[randomIndex] = a
    }
  }
  return newArray
}

export { shuffle }
