// functions for manipulating the queue of tracks in the player
// TODO: refactor this to be a data class that encapsulates the queue and its operations, which creates new instances of the queue when it is modified, rather than mutating the existing queue
// look at persistent data structures for inspiration

export function advance(
  currentIndex: number,
  queueLength: number,
): number | undefined {
  const next = currentIndex + 1
  if (next >= queueLength) return undefined
  return next
}

export function prev(currentIndex: number): number | undefined {
  if (currentIndex <= 0) return undefined
  return currentIndex - 1
}

export function remove<T>(
  items: T[],
  deleteIndex: number,
  currentIndex: number,
): { items: T[]; currentIndex: number } | undefined {
  if (!items[deleteIndex]) return undefined
  const newItems = [...items]
  newItems.splice(deleteIndex, 1)

  if (newItems.length === 0) {
    return { items: newItems, currentIndex: 0 }
  }

  if (deleteIndex < currentIndex) {
    return { items: newItems, currentIndex: currentIndex - 1 }
  }
  if (deleteIndex === currentIndex) {
    return {
      items: newItems,
      currentIndex: Math.min(currentIndex, newItems.length - 1),
    }
  }
  return { items: newItems, currentIndex }
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}
