import type { Team } from '@/models/teams'

export type WizardStep = 1 | 2

export type DivisionAssignment = readonly [Team, Team, Team]

/** Division slot: 0–3 teams (in progress) or exactly 3 (complete). */
export type DivisionSlot = readonly Team[]

export type WizardState = {
  step: WizardStep
  teamNames: Record<Team, string>
  /** 4 division slots, each 0–3 teams. Complete when each has 3. */
  divisionAssignments: readonly DivisionSlot[]
  divisionNames: readonly [string, string, string, string]
}
