/** All 12 league team identifiers (single letters A–L). */
const Team = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  H: 'H',
  I: 'I',
  J: 'J',
  K: 'K',
  L: 'L',
} as const

/** Union of all team identifiers. */
export type Team = (typeof Team)[keyof typeof Team]

export { Team }
