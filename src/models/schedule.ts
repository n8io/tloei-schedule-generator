import type { Week } from './week.ts'

const Season = {
  REGULAR: 'REGULAR',
} as const

type Season = (typeof Season)[keyof typeof Season]

type Schedule = {
  season: number
  type: Season
  weeks: Week[]
}

export type { Schedule }
export { Season }
