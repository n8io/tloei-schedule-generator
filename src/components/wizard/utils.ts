import { Team } from '@/models/teams'
import type { DivisionSlot } from '@/types/wizard'

/** Shuffle team order within each division (same teams, different order). Used for retries. */
export function shuffleDivisionTeamOrder(assignments: readonly DivisionSlot[]): DivisionSlot[] {
  return assignments.map((div) => {
    const arr = [...div]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
    }
    return arr as DivisionSlot
  })
}

/** Randomly assign all 12 teams into 4 divisions of 3. */
export function shuffleTeams(): readonly DivisionSlot[] {
  const allTeams = Object.values(Team) as (typeof Team)[keyof typeof Team][]
  const shuffled = [...allTeams]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }
  return [
    shuffled.slice(0, 3) as DivisionSlot,
    shuffled.slice(3, 6) as DivisionSlot,
    shuffled.slice(6, 9) as DivisionSlot,
    shuffled.slice(9, 12) as DivisionSlot,
  ]
}

export function teamColorVar(team: Team): string {
  return `var(--team-${team.toLowerCase()})`
}

/** Foreground color for team chips (white, for contrast on darker team backgrounds). */
export const TEAM_CHIP_FOREGROUND = 'var(--team-chip-foreground)'
