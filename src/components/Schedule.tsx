import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TEAM_CHIP_FOREGROUND, teamColorVar } from '@/components/wizard/utils'
import type { LeagueConfig } from '@/index'
import type { Team as TeamType } from '@/models/teams'
import type { Week } from '@/models/week'

import { Layers, Loader2, Swords } from 'lucide-react'
import { useState } from 'react'

function abbrevFromNames(teamNames: Record<TeamType, string>, team: TeamType): string {
  const name = teamNames[team]?.trim()
  return name ? name.slice(0, 4).toUpperCase() : team
}

type ScheduleProps = {
  leagueConfig: LeagueConfig
  teamNames: Record<TeamType, string>
  divisionNames: readonly [string, string, string, string]
  /** The pre-generated schedule. null = still generating. */
  schedule: Week[] | null
}

type HighlightMode = 'team' | 'divisional' | 'rivalry' | null

export function Schedule({ leagueConfig, teamNames, divisionNames, schedule }: ScheduleProps) {
  const [focusedTeam, setFocusedTeam] = useState<TeamType | null>(null)
  const [focusedFilter, setFocusedFilter] = useState<'divisional' | 'rivalry' | null>(null)

  const abbrev = (t: TeamType) => abbrevFromNames(teamNames, t)

  const highlightMode: HighlightMode =
    focusedFilter ?? (focusedTeam ? 'team' : null)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6">
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4"
          role="list"
          aria-label="Teams by division – hover or focus to highlight"
        >
          {leagueConfig.divisions.map((division, divIdx) => (
            <div
              key={`div-${divIdx}`}
              className="flex flex-col rounded-lg border border-border bg-muted/40 px-4 py-3"
            >
              <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {divisionNames[divIdx]?.trim() || `Division ${divIdx + 1}`}
              </span>
              <div className="flex flex-wrap gap-2">
                {division.map((team) => (
                  <span
                    key={team}
                    role="listitem"
                    tabIndex={0}
                    className="rounded-md px-2 py-1 text-sm font-medium shadow-sm transition-opacity cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    style={{
                      backgroundColor: teamColorVar(team),
                      color: TEAM_CHIP_FOREGROUND,
                      opacity:
                        highlightMode === null || (highlightMode === 'team' && focusedTeam === team) ? 1 : 0.5,
                    }}
                    onMouseEnter={() => {
                      setFocusedFilter(null)
                      setFocusedTeam(team)
                    }}
                    onMouseLeave={() => setFocusedTeam(null)}
                    onFocus={() => {
                      setFocusedFilter(null)
                      setFocusedTeam(team)
                    }}
                    onBlur={() => setFocusedTeam(null)}
                  >
                    {abbrev(team)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter matchups – hover or focus to highlight"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-transparent bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground outline-none transition-opacity hover:bg-secondary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{
                  opacity: highlightMode === null || highlightMode === 'divisional' ? 1 : 0.6,
                }}
                onMouseEnter={() => {
                  setFocusedTeam(null)
                  setFocusedFilter('divisional')
                }}
                onMouseLeave={() => setFocusedFilter(null)}
                onFocus={() => {
                  setFocusedTeam(null)
                  setFocusedFilter('divisional')
                }}
                onBlur={() => setFocusedFilter(null)}
              >
                <Layers className="size-4 shrink-0 text-[var(--icon-divisional)]" />
                Divisional
              </span>
            </TooltipTrigger>
            <TooltipContent>Highlight divisional matchups</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium outline-none transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{
                  opacity: highlightMode === null || highlightMode === 'rivalry' ? 1 : 0.6,
                }}
                onMouseEnter={() => {
                  setFocusedTeam(null)
                  setFocusedFilter('rivalry')
                }}
                onMouseLeave={() => setFocusedFilter(null)}
                onFocus={() => {
                  setFocusedTeam(null)
                  setFocusedFilter('rivalry')
                }}
                onBlur={() => setFocusedFilter(null)}
              >
                <Swords className="size-4 shrink-0 text-[var(--icon-rivalry)]" />
                Rivalry
              </span>
            </TooltipTrigger>
            <TooltipContent>Highlight rivalry matchups</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Week</TableHead>
              {Array.from({ length: 6 }, (_, i) => (
                <TableHead key={`game-${i}`}>Game {i + 1}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule === null ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : (
              schedule.map((week, weekIdx) => (
              <TableRow key={`week-${weekIdx}`}>
                <TableCell className="font-medium">{weekIdx + 1}</TableCell>
                {Array.from({ length: 6 }, (_, idx) => {
                  const mu = week.matchUps[idx]
                  if (!mu) return <TableCell key={`week-${weekIdx}-game-${idx}`} />
                  const includesFocusedTeam =
                    focusedTeam && (mu.teams.away === focusedTeam || mu.teams.home === focusedTeam)
                  const isDimmed =
                    highlightMode === null
                      ? false
                      : highlightMode === 'team'
                        ? !includesFocusedTeam
                        : highlightMode === 'divisional'
                          ? !mu.isDivisional
                          : !mu.isRivalry

                  return (
                    <TableCell
                      key={`week-${weekIdx}-game-${idx}`}
                      className={`transition-[filter,opacity] duration-300 ease-out ${isDimmed ? 'grayscale opacity-60' : ''}`}
                    >
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="flex flex-wrap items-center gap-1">
                          <span
                            role="button"
                            tabIndex={0}
                            className="rounded px-1.5 py-0.5 text-xs font-medium cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            style={{
                              backgroundColor: teamColorVar(mu.teams.away),
                              color: TEAM_CHIP_FOREGROUND,
                            }}
                            onMouseEnter={() => {
                              setFocusedFilter(null)
                              setFocusedTeam(mu.teams.away)
                            }}
                            onMouseLeave={() => setFocusedTeam(null)}
                            onFocus={() => {
                              setFocusedFilter(null)
                              setFocusedTeam(mu.teams.away)
                            }}
                            onBlur={() => setFocusedTeam(null)}
                          >
                            {abbrev(mu.teams.away)}
                          </span>
                          <span className="text-muted-foreground">@</span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="rounded px-1.5 py-0.5 text-xs font-medium cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            style={{
                              backgroundColor: teamColorVar(mu.teams.home),
                              color: TEAM_CHIP_FOREGROUND,
                            }}
                            onMouseEnter={() => {
                              setFocusedFilter(null)
                              setFocusedTeam(mu.teams.home)
                            }}
                            onMouseLeave={() => setFocusedTeam(null)}
                            onFocus={() => {
                              setFocusedFilter(null)
                              setFocusedTeam(mu.teams.home)
                            }}
                            onBlur={() => setFocusedTeam(null)}
                          >
                            {abbrev(mu.teams.home)}
                          </span>
                        </span>
                      {mu.isDivisional && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="inline-flex cursor-default items-center rounded px-1.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            >
                              <Layers className="size-3.5 text-[var(--icon-divisional)]" aria-hidden />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Divisional</TooltipContent>
                        </Tooltip>
                      )}
                      {mu.isRivalry && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="inline-flex cursor-default items-center rounded px-1.5 py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            >
                              <Swords className="size-3.5 text-[var(--icon-rivalry)]" aria-hidden />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Rivalry</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </TableCell>
                  )
                })}
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}
