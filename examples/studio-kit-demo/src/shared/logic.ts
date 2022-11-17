/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
// Ensure an item is iterable as an array
export const asArray = <T>(x: T | T[]): T[] => {
  return Array.isArray(x) ? (x as T[]) : [x as T]
}
