import { Team } from '@/models/teams'
import type { WizardState } from '@/types/wizard'
import { shuffle } from '@/utils'

const WIZARD_STORAGE_KEY = 'tloei-league-wizard'

/** Default: all teams unassigned (4 empty division slots). */
const defaultDivisionAssignments: readonly (readonly Team[])[] = [[], [], [], []]

const allTeams = Object.values(Team) as Team[]

/** Default display names for teams A–L (pool of 12 names). */
const defaultTeamNames: Record<Team, string> = {
  [Team.A]: 'NATE',
  [Team.B]: 'BDUB',
  [Team.C]: 'CLDL',
  [Team.D]: 'WEAV',
  [Team.E]: 'JROD',
  [Team.F]: 'RCKY',
  [Team.G]: 'MBIX',
  [Team.H]: 'EBBY',
  [Team.I]: 'DIRT',
  [Team.J]: 'KURT',
  [Team.K]: 'HURL',
  [Team.L]: 'TOBY',
}

/** Shuffle the team→name mapping so each run displays different labels. Cosmetic only; does not affect schedule generation. */
export function shuffleTeamNames(teamNames: Record<Team, string>): Record<Team, string> {
  const names = shuffle([...Object.values(teamNames)])
  const teams = allTeams
  const result = {} as Record<Team, string>
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i]
    const n = names[i]
    if (t !== undefined && n !== undefined) result[t] = n
  }
  return result
}

export function getInitialWizardState(): WizardState {
  const teamNames = shuffleTeamNames(defaultTeamNames)
  return {
    step: 1, // Assign divisions (first step)
    teamNames,
    divisionAssignments: defaultDivisionAssignments,
    divisionNames: ['', '', '', ''],
  }
}

export function loadWizardState(): WizardState | null {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const rawStep = (parsed as { step?: number }).step
    const step = rawStep === 3 ? 2 : rawStep
    if (step !== 1 && step !== 2) return null
    const state = { ...parsed, step } as WizardState
    if (!state.teamNames || !state.divisionAssignments || !state.divisionNames) return null
    return state
  } catch {
    return null
  }
}

export function saveWizardState(state: WizardState): void {
  localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state))
}

export function clearWizardState(): void {
  localStorage.removeItem(WIZARD_STORAGE_KEY)
}
