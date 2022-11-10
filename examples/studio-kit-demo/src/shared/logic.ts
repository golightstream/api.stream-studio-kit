// Ensure an item is iterable as an array
export const asArray = <T>(x: T | T[]): T[] => {
  return Array.isArray(x) ? (x as T[]) : [x as T]
}
