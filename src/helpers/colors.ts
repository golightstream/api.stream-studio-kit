/* ---------------------------------------------------------------------------------------------
 * Copyright (c) Infiniscene, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------- */
import { color } from 'csx'

// Alias color helper for direct import
export { color }

// Alias color helper for named import (e.g. Color.of())
export const of = color

export const transparent = color('rgba(0,0,0,0)')
export const white = color('#ffffff')
export const black = color('#000000')

/**
 * Studio2 colors
 */

const weights = {
  primary: {
    50: '#EAFAF5',
    100: '#D5F6EB',
    200: '#ABEDD7',
    300: '#82E3C3',
    400: '#58DAAF',
    500: '#26AD80',
    600: '#25A77C',
    700: '#1C7D5D',
    800: '#12543E',
  } as const,
  secondary: {
    50: '#FBEAEA',
    100: '#F7D4D4',
    200: '#EFA9A9',
    300: '#E77E7E',
    400: '#FF6F64',
    500: '#E9554A',
    600: '#CB362B',
    700: '#811818',
    800: '#561010',
  } as const,
  neutral: {
    0: '#ffffff',
    10: '#f5f5f5',
    200: '#d9d9d9',
    300: '#bababa',
    350: '#999999',
    400: '#9e9e9e',
    500: '#808080',
    600: '#666666',
    700: '#4d4d4d',
    800: '#303030',
    900: '#141414',
    1000: '#000000',
  } as const,
  warning: {
    400: '#FFC28A',
    500: '#FFAE64',
    600: '#F29540',
  },
} as const

export type Type = keyof typeof weights
export const types = Object.keys(weights) as Type[]

const weight = (type: keyof typeof weights) => (weight: number) => {
  const map = weights[type] as any
  if (map[weight]) return map[weight]

  const keys = Object.keys(weights.primary).map(Number)
  const result = keys.find((x) => weight <= x)

  // Return last color if none matches
  if (result) {
    return map[result]
  } else {
    return map[keys.slice(keys.length - 1)[0]]
  }
}

export const primary = weight('primary')
export const neutral = weight('neutral')
export const secondary = weight('secondary')
export const warning = weight('warning')

/**
 * Brand primary colors
 */

export const lightstream = color('#26ad80')
export const twitch = color('#9156ff')
export const linkedin = color('#2867b2')
export const youtube = color('#ff0000')
export const facebook = color('#1877f2')
export const twitter = color('#1da1f2')
