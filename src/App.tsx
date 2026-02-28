import { Schedule } from '@/components/Schedule'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Wizard } from '@/components/wizard/Wizard'
import { shuffleDivisionTeamOrder, shuffleTeams } from '@/components/wizard/utils'
import { wizardStateToLeagueConfig } from '@/lib/compute-rivalries'
import { randomGeneratingMessage } from '@/lib/generating-messages'
import {
  buildScheduleUrlState,
  encodeScheduleUrlState,
  parseScheduleUrlState,
  SCHEDULE_STATE_PARAM,
} from '@/lib/url-state'
import { saveWizardState, shuffleTeamNames } from '@/lib/wizard-storage'
import type { WizardState } from '@/types/wizard'
import confetti from 'canvas-confetti'
import { Calendar, ChevronDown, Loader2, Moon, Pencil, RotateCw, Share2, Shuffle, Sun, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { generateSchedule } from '@/index'
import type { LeagueConfig } from '@/config'
import type { Week } from '@/models/week'

const GENERATION_DELAY_MS = 2500
const MAX_GENERATION_RETRIES = 150

function isValidSchedule(s: { matchUps: unknown[] }[]): boolean {
  return s.length === 14 && s.every((w) => w.matchUps.length === 6)
}

async function generateScheduleWithRetry(divisionAssignments: WizardState['divisionAssignments']): Promise<Week[]> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
    try {
      const assignments = attempt === 0 ? divisionAssignments : shuffleDivisionTeamOrder(divisionAssignments)
      const config = wizardStateToLeagueConfig(assignments)
      const s = generateSchedule(config)
      if (isValidSchedule(s)) return s
    } catch (e) {
      lastError = e
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  }
  throw lastError ?? new Error('Schedule generation failed after multiple attempts. Try Regenerate or Randomize.')
}

function getScheduleConfigKey(divisionAssignments: WizardState['divisionAssignments'], regenerateKey: number): string {
  return JSON.stringify(divisionAssignments) + '-' + regenerateKey
}

function fireConfetti() {
  const count = 200
  const defaults = { origin: { y: 0.7 }, spread: 100 }
  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) })
  }
  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

function LoaderOverlay({ message = 'Generating schedule...' }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/90 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <Loader2 className="text-primary size-16 animate-spin" strokeWidth={2} aria-hidden />
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
      </div>
      <p className="text-muted-foreground text-lg font-medium">{message}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="bg-primary size-2 animate-bounce rounded-full"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

type AppPhase = 'landing' | 'wizard' | 'schedule'

const THEME_KEY = 'tloei-theme'

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
    return true // default dark
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle: () => setIsDark((d) => !d) }
}

function App() {
  const { isDark, toggle } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlStateParam = searchParams.get(SCHEDULE_STATE_PARAM)
  const parsedFromUrl = urlStateParam ? parseScheduleUrlState(urlStateParam) : null

  const [phase, setPhase] = useState<AppPhase>(() => {
    if (parsedFromUrl) return 'schedule'
    const stored = localStorage.getItem('tloei-league-wizard')
    if (stored) return 'wizard'
    return 'landing'
  })
  const [wizardState, setWizardState] = useState<WizardState | null>(() =>
    parsedFromUrl ? parsedFromUrl.wizardState : null
  )
  const [schedule, setSchedule] = useState<Week[] | null>(() =>
    parsedFromUrl ? parsedFromUrl.schedule : null
  )
  const scheduleConfigKeyRef = useRef<string | null>(
    parsedFromUrl ? getScheduleConfigKey(parsedFromUrl.wizardState.divisionAssignments, 0) : null
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingMessage, setGeneratingMessage] = useState('')
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [regenerateKey, setRegenerateKey] = useState(0)

  const runScheduleGeneration = useCallback(
    async (divisionAssignments: WizardState['divisionAssignments'], key: string, wizard: WizardState) => {
      const s = await generateScheduleWithRetry(divisionAssignments)
      setSchedule(s)
      scheduleConfigKeyRef.current = key
      setGenerationError(null)
      const urlState = buildScheduleUrlState(wizard, s)
      if (urlState) {
        setSearchParams({ [SCHEDULE_STATE_PARAM]: encodeScheduleUrlState(urlState) }, { replace: true })
      }
      return s
    },
    [setSearchParams]
  )

  const handleWizardComplete = async (state: WizardState) => {
    setWizardState(state)
    setGeneratingMessage(randomGeneratingMessage())
    setGenerationError(null)
    setIsGenerating(true)
    try {
      const key = getScheduleConfigKey(state.divisionAssignments, regenerateKey)
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, GENERATION_DELAY_MS)),
        runScheduleGeneration(state.divisionAssignments, key, state),
      ])
      setPhase('schedule')
      fireConfetti()
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!wizardState) return
    setGeneratingMessage(randomGeneratingMessage())
    setGenerationError(null)
    setIsGenerating(true)
    try {
      const nextKey = regenerateKey + 1
      setRegenerateKey(nextKey)
      const key = getScheduleConfigKey(wizardState.divisionAssignments, nextKey)
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, GENERATION_DELAY_MS)),
        runScheduleGeneration(wizardState.divisionAssignments, key, wizardState),
      ])
      fireConfetti()
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRandomizeDivisions = async () => {
    if (!wizardState) return
    setGeneratingMessage(randomGeneratingMessage())
    setGenerationError(null)
    setIsGenerating(true)
    try {
      const newAssignments = shuffleTeams()
      const nextState: WizardState = {
        ...wizardState,
        divisionAssignments: newAssignments,
        teamNames: shuffleTeamNames(wizardState.teamNames),
      }
      setWizardState(nextState)
      saveWizardState(nextState)
      const nextKey = regenerateKey + 1
      setRegenerateKey(nextKey)
      const key = getScheduleConfigKey(nextState.divisionAssignments, nextKey)
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, GENERATION_DELAY_MS)),
        runScheduleGeneration(nextState.divisionAssignments, key, nextState),
      ])
      fireConfetti()
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartOver = () => {
    localStorage.removeItem('tloei-league-wizard')
    setWizardState(null)
    setSchedule(null)
    scheduleConfigKeyRef.current = null
    setGenerationError(null)
    setPhase('landing')
    setSearchParams({}, { replace: true })
  }

  const handleEditDivisions = () => {
    if (!wizardState) return
    saveWizardState({ ...wizardState, step: 1 })
    setPhase('wizard')
  }

  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'shared'>('idle')
  const handleShare = useCallback(async () => {
    const url = window.location.href
    if (navigator.share && navigator.canShare?.({ url })) {
      try {
        await navigator.share({
          title: 'TLOEI Schedule',
          url,
        })
        setShareFeedback('shared')
      } catch {
        await navigator.clipboard.writeText(url)
        setShareFeedback('copied')
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShareFeedback('copied')
    }
    setTimeout(() => setShareFeedback('idle'), 2000)
  }, [])

  const handleNavigateToSchedule = async (state: WizardState) => {
    const assignments = state.divisionAssignments
    if (assignments.length !== 4 || assignments.some((d) => d.length !== 3)) return
    setWizardState(state)
    const key = getScheduleConfigKey(state.divisionAssignments, regenerateKey)
    if (schedule !== null && scheduleConfigKeyRef.current === key) {
      setPhase('schedule')
      return
    }
    setGeneratingMessage(randomGeneratingMessage())
    setGenerationError(null)
    setIsGenerating(true)
    try {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, GENERATION_DELAY_MS)),
        runScheduleGeneration(assignments, key, state),
      ])
      setPhase('schedule')
      fireConfetti()
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
    } finally {
      setIsGenerating(false)
    }
  }

  const leagueConfig = useMemo(() => {
    if (!wizardState) return null
    const assignments = wizardState.divisionAssignments
    if (assignments.length !== 4 || assignments.some((d) => d.length !== 3)) return null
    return wizardStateToLeagueConfig(assignments)
  }, [wizardState])

  const divisionsComplete =
    !!wizardState?.divisionAssignments &&
    wizardState.divisionAssignments.length === 4 &&
    wizardState.divisionAssignments.every((d) => d.length === 3)

  const handleViewSchedule = useCallback(async () => {
    if (!wizardState || !divisionsComplete) return
    const key = getScheduleConfigKey(wizardState.divisionAssignments, regenerateKey)
    if (schedule !== null && scheduleConfigKeyRef.current === key) {
      setPhase('schedule')
      return
    }
    setGeneratingMessage(randomGeneratingMessage())
    setGenerationError(null)
    setIsGenerating(true)
    try {
      await runScheduleGeneration(wizardState.divisionAssignments, key, wizardState)
      setPhase('schedule')
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
    } finally {
      setIsGenerating(false)
    }
  }, [wizardState, regenerateKey, schedule, runScheduleGeneration, divisionsComplete])

  // When on schedule page with new config (e.g. after editing divisions), generate if not cached
  useEffect(() => {
    if (phase !== 'schedule' || !wizardState || !leagueConfig) return
    const key = getScheduleConfigKey(wizardState.divisionAssignments, regenerateKey)
    if (schedule !== null && scheduleConfigKeyRef.current === key) return
    let cancelled = false
    generateScheduleWithRetry(wizardState.divisionAssignments)
      .then((s) => {
        if (!cancelled) {
          setSchedule(s)
          scheduleConfigKeyRef.current = key
          setGenerationError(null)
          const urlState = buildScheduleUrlState(wizardState, s)
          if (urlState) {
            setSearchParams({ [SCHEDULE_STATE_PARAM]: encodeScheduleUrlState(urlState) }, { replace: true })
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setGenerationError(e instanceof Error ? e.message : 'Schedule generation failed. Try Randomize or adjust divisions.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [phase, wizardState, leagueConfig, regenerateKey, schedule, setSearchParams])

  // Keep URL in sync when wizard metadata (division names, team names) changes without regeneration
  useEffect(() => {
    if (phase !== 'schedule' || !wizardState || !schedule) return
    const urlState = buildScheduleUrlState(wizardState, schedule)
    if (urlState) {
      setSearchParams({ [SCHEDULE_STATE_PARAM]: encodeScheduleUrlState(urlState) }, { replace: true })
    }
  }, [phase, wizardState, schedule, setSearchParams])

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {isGenerating && <LoaderOverlay message={generatingMessage} />}
      {generationError && !isGenerating && (
        <div
          role="alert"
          className="mb-4 sm:mb-6 flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{generationError}</span>
          <button
            type="button"
            onClick={() => setGenerationError(null)}
            className="shrink-0 rounded px-2 py-1 text-destructive/80 hover:bg-destructive/20 hover:text-destructive"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <header className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setPhase('landing')
              setSearchParams({}, { replace: true })
            }}
            className="shrink-0 rounded-xl transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Go to home"
          >
            <img
              src="https://avatars.slack-edge.com/2019-03-09/573001426103_eb2f3806c05c780d720f_132.png"
              alt=""
              className="size-12 rounded-xl"
              aria-hidden
            />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">TLOEI Schedule</h1>
            <p className="text-muted-foreground">The League of Extraordinary Idiots</p>
          </div>
        </div>
        <nav className="flex shrink-0 flex-wrap items-center gap-2" aria-label="Schedule actions">
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          {phase === 'wizard' && wizardState && divisionsComplete && (
            <Button variant="outline" size="sm" onClick={handleViewSchedule}>
              <Calendar className="size-4" />
              View schedule
            </Button>
          )}
          {phase === 'schedule' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                aria-label={shareFeedback === 'copied' || shareFeedback === 'shared' ? 'Link copied' : 'Share schedule'}
              >
                <Share2 className="size-4 shrink-0" />
                {(shareFeedback === 'copied' || shareFeedback === 'shared')
                  ? shareFeedback === 'shared'
                    ? 'Shared'
                    : 'Copied!'
                  : <span className="hidden sm:inline">Share</span>}
              </Button>
              <Button size="sm" onClick={handleRegenerate} aria-label="Regenerate schedule">
                <RotateCw className="size-4 shrink-0" />
                <span className="hidden sm:inline">Regenerate</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleEditDivisions}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Edit divisions</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="More actions">
                    More
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRandomizeDivisions}>
                    <Shuffle className="size-4" />
                    Randomize divisions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleStartOver}>
                    <Trash2 className="size-4" />
                    Start over
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>
      </header>

      {phase === 'landing' && (
        <section className="flex flex-col items-center justify-center gap-8 py-16 md:py-24" aria-label="Build schedule">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to build the season?</h2>
            <p className="text-muted-foreground text-lg">
              Arrange divisions, name them, and generate a balanced schedule with matchups, rivalries, and fair
              home/away distribution.
            </p>
          </div>

          <div className="w-full max-w-xl space-y-3">
            <p className="text-center text-sm font-medium text-foreground">What makes a balanced schedule?</p>
            <ul className="flex flex-wrap justify-center gap-2">
              <li className="bg-muted/80 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <span aria-hidden>✅</span>
                <span>One game per team per week</span>
              </li>
              <li className="bg-muted/80 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <span aria-hidden>✅</span>
                <span>Divisional opponents play exactly twice</span>
              </li>
              <li className="bg-muted/80 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <span aria-hidden>✅</span>
                <span>Cross-division rivalries (each plays twice)</span>
              </li>
              <li className="bg-muted/80 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <span aria-hidden>✅</span>
                <span>7 home, 7 away per team</span>
              </li>
              <li className="bg-muted/80 flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <span aria-hidden>✅</span>
                <span>No back-to-back same matchup</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setPhase('wizard')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-semibold shadow-lg transition-all hover:scale-105 active:scale-100"
          >
            Build the Season Schedule
          </button>
        </section>
      )}

      {phase === 'wizard' && (
        <Wizard
          onComplete={handleWizardComplete}
          hasExistingSchedule={!!wizardState}
          onNavigateToSchedule={handleNavigateToSchedule}
          onWizardStateChange={setWizardState}
        />
      )}

      {phase === 'schedule' && wizardState && leagueConfig && (
        <section aria-label="Schedule" className="pb-12">
          <Schedule
            leagueConfig={leagueConfig}
            teamNames={wizardState.teamNames}
            divisionNames={wizardState.divisionNames}
            schedule={schedule}
          />
        </section>
      )}
    </div>
  )
}

export default App
