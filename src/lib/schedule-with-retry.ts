import { shuffleDivisionTeamOrder } from '@/components/wizard/utils'
import {
  wizardStateToLeagueConfig,
  wizardStateToLeagueConfigWithRandomRivalries,
} from '@/lib/compute-rivalries'
import { generateSchedule } from '@/index'
import type { Week } from '@/models/week'
import type { WizardState } from '@/types/wizard'

export const MAX_GENERATION_RETRIES = 150

function isValidSchedule(s: { matchUps: unknown[] }[]): boolean {
  return s.length === 14 && s.every((w) => w.matchUps.length === 6)
}

export type GenerateScheduleWithRetryOptions = {
  /** Optional delay between retries. Default: requestAnimationFrame. Pass () => Promise.resolve() for sync (tests). */
  delay?: () => Promise<void>
}

export async function generateScheduleWithRetry(
  divisionAssignments: WizardState['divisionAssignments'],
  options?: GenerateScheduleWithRetryOptions
): Promise<Week[]> {
  const delay = options?.delay ?? (() => new Promise<void>((r) => requestAnimationFrame(() => r())))
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
    try {
      const config =
        attempt === 0
          ? wizardStateToLeagueConfig(divisionAssignments)
          : attempt % 2 === 1
            ? wizardStateToLeagueConfig(shuffleDivisionTeamOrder(divisionAssignments))
            : wizardStateToLeagueConfigWithRandomRivalries(divisionAssignments)
      const s = generateSchedule(config)
      if (isValidSchedule(s)) return s
    } catch (e) {
      lastError = e
    }
    await delay()
  }
  throw lastError ?? new Error('Schedule generation failed after multiple attempts. Try Regenerate or Randomize.')
}
