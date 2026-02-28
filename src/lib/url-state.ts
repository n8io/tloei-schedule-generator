import type { Team } from '@/models/teams'
import type { Week } from '@/models/week'
import type { WizardState } from '@/types/wizard'

/** URL param key for schedule state. */
export const SCHEDULE_STATE_PARAM = 's'

/** Serializable schedule state: wizard config + schedule data for sharing via URL. */
export type ScheduleUrlState = {
  v: 1
  w: {
    teamNames: Record<Team, string>
    divisionAssignments: readonly (readonly Team[])[]
    divisionNames: readonly [string, string, string, string]
  }
  /** 14 weeks, each 6 matchups: { h: home Team, a: away Team, d: isDivisional, r: isRivalry } */
  schedule: { h: Team; a: Team; d: boolean; r: boolean }[][]
}

function weeksToSerializable(weeks: Week[]): ScheduleUrlState['schedule'] {
  return weeks.map((week) =>
    week.matchUps.map((m) => ({
      h: m.teams.home,
      a: m.teams.away,
      d: m.isDivisional,
      r: m.isRivalry,
    }))
  )
}

function serializableToWeeks(sched: ScheduleUrlState['schedule']): Week[] {
  return sched.map((week) => ({
    matchUps: week.map((m) => ({
      teams: { home: m.h, away: m.a },
      isDivisional: m.d,
      isRivalry: m.r,
    })),
  }))
}

/** Build URL state from wizard state and schedule. Returns null if invalid. */
export function buildScheduleUrlState(wizardState: WizardState, schedule: Week[]): ScheduleUrlState | null {
  const { divisionAssignments, teamNames, divisionNames } = wizardState
  if (
    divisionAssignments.length !== 4 ||
    divisionAssignments.some((d) => d.length !== 3) ||
    schedule.length !== 14 ||
    schedule.some((w) => w.matchUps.length !== 6)
  ) {
    return null
  }
  return {
    v: 1,
    w: {
      teamNames: { ...teamNames },
      divisionAssignments: divisionAssignments.map((d) => [...d]),
      divisionNames: [...divisionNames],
    },
    schedule: weeksToSerializable(schedule),
  }
}

/** Parse URL state from base64 string. Returns null if invalid. */
export function parseScheduleUrlState(
  encoded: string
): { wizardState: WizardState; schedule: Week[] } | null {
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = base64DecodeUnicode(normalized)
    const raw = JSON.parse(json) as unknown
    if (!raw || typeof raw !== 'object') return null
    const state = raw as ScheduleUrlState
    if (state.v !== 1 || !state.w || !state.schedule) return null
    const { teamNames, divisionAssignments, divisionNames } = state.w
    if (
      !teamNames ||
      !divisionAssignments ||
      divisionAssignments.length !== 4 ||
      divisionAssignments.some((d: unknown) => !Array.isArray(d) || d.length !== 3) ||
      !divisionNames ||
      !Array.isArray(divisionNames) ||
      divisionNames.length !== 4
    ) {
      return null
    }
    if (
      state.schedule.length !== 14 ||
      state.schedule.some((w: unknown) => !Array.isArray(w) || w.length !== 6)
    ) {
      return null
    }
    const schedule = serializableToWeeks(state.schedule)
    const wizardState: WizardState = {
      step: 2,
      teamNames: teamNames as Record<Team, string>,
      divisionAssignments: divisionAssignments as WizardState['divisionAssignments'],
      divisionNames: divisionNames as WizardState['divisionNames'],
    }
    return { wizardState, schedule }
  } catch {
    return null
  }
}

/** Base64-encode a UTF-8 string (btoa only supports Latin1). */
function base64EncodeUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )
}

/** Base64-decode to UTF-8 string. */
function base64DecodeUnicode(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

/** Encode schedule state to base64-safe string for URL. */
export function encodeScheduleUrlState(state: ScheduleUrlState): string {
  const json = JSON.stringify(state)
  return base64EncodeUnicode(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
