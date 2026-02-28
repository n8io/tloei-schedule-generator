import { cn } from '@/lib/utils'
import { Team } from '@/models/teams'
import type { DivisionSlot } from '@/types/wizard'
import { shuffleTeams } from './utils'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { TEAM_CHIP_FOREGROUND, teamColorVar } from './utils'

const ALL_TEAMS = Object.values(Team) as Team[]
const UNASSIGNED_ID = 'unassigned'
const DIV_IDS = ['div-0', 'div-1', 'div-2', 'div-3'] as const
const DROPPABLE_IDS = [UNASSIGNED_ID, ...DIV_IDS] as const

function getUnassigned(divisions: readonly DivisionSlot[]): Team[] {
  const assigned = new Set(divisions.flat())
  return ALL_TEAMS.filter((t) => !assigned.has(t))
}

function TeamChip({
  team,
  teamName,
  isDragging,
}: {
  team: Team
  teamName: string
  isDragging?: boolean
}) {
  const displayName = teamName.trim() || `Team ${team}`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition-shadow',
        isDragging && 'opacity-90 shadow-lg ring-2 ring-primary'
      )}
      style={{
        backgroundColor: teamColorVar(team),
        color: TEAM_CHIP_FOREGROUND,
      }}
    >
      {displayName}
    </span>
  )
}

function DraggableTeamChip({
  team,
  teamName,
  containerId,
}: {
  team: Team
  teamName: string
  containerId: string
}) {
  const id = `team-${team}`
  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id,
    data: { team, containerId },
  })
  const { setNodeRef: setDroppableRef } = useDroppable({ id, data: { team } })
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node)
    setDroppableRef(node)
  }
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <TeamChip team={team} teamName={teamName} isDragging={isDragging} />
    </div>
  )
}

function DroppableArea({
  id,
  label,
  divisionName,
  onDivisionNameChange,
  teams,
  teamNames,
  maxTeams,
  showNameInput,
}: {
  id: string
  label: string
  divisionName?: string
  onDivisionNameChange?: (value: string) => void
  teams: readonly Team[]
  teamNames: Record<Team, string>
  maxTeams: number | null
  showNameInput?: boolean
}) {
  const isFull = maxTeams !== null && teams.length >= maxTeams
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[80px] rounded-xl border-2 border-dashed p-4 transition-colors',
        isOver && !isFull ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 bg-muted/30',
        isFull && 'opacity-75'
      )}
    >
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-medium">
        {showNameInput && onDivisionNameChange !== undefined ? (
          <input
            type="text"
            maxLength={24}
            value={divisionName ?? ''}
            onChange={(e) => onDivisionNameChange(e.target.value)}
            placeholder={`${label} name...`}
            className="border-input w-full max-w-[180px] rounded-md border bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={`Name for ${label}`}
          />
        ) : (
          <span>{label}</span>
        )}
        {maxTeams !== null && (
          <span>
            {teams.length}/{maxTeams}
          </span>
        )}
      </div>
      <div className="flex min-h-[48px] flex-wrap gap-2">
        {teams.map((team) => (
          <DraggableTeamChip key={team} team={team} teamName={teamNames[team] ?? ''} containerId={id} />
        ))}
      </div>
    </div>
  )
}

type DivisionsStepProps = {
  divisionAssignments: readonly DivisionSlot[]
  divisionNames: readonly [string, string, string, string]
  teamNames: Record<Team, string>
  onDivisionAssignmentsChange: (assignments: readonly DivisionSlot[]) => void
  onDivisionNamesChange: (names: [string, string, string, string]) => void
  onGenerate: () => void
  hasExistingSchedule?: boolean
}

export function DivisionsStep({
  divisionAssignments,
  divisionNames,
  teamNames,
  onDivisionAssignmentsChange,
  onDivisionNamesChange,
  onGenerate,
  hasExistingSchedule = false,
}: DivisionsStepProps) {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const unassigned = getUnassigned(divisionAssignments)

  const handleDivisionNameChange = (index: number, value: string) => {
    const next = [...divisionNames] as [string, string, string, string]
    next[index] = value
    onDivisionNamesChange(next)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { team?: Team }
    if (data?.team) setActiveTeam(data.team)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTeam(null)
    const { active, over } = event
    if (!over) return
    const team = (active.data.current as { team?: Team })?.team
    if (!team) return

    const overId = String(over.id)
    const sourceId = (active.data.current as { containerId?: string })?.containerId
    if (!sourceId) return

    if (overId.startsWith('team-')) {
      const targetTeam = overId.replace('team-', '') as Team
      if (targetTeam === team) return

      const sourceDivIdx = sourceId === UNASSIGNED_ID ? -1 : DIV_IDS.indexOf(sourceId as (typeof DIV_IDS)[number])
      const targetDivIdx = divisionAssignments.findIndex((d) => d.includes(targetTeam))

      const divisions = divisionAssignments.map((d) => [...d])

      if (sourceDivIdx >= 0 && targetDivIdx >= 0) {
        const source = divisions[sourceDivIdx]
        const target = divisions[targetDivIdx]
        if (!source || !target || !source.includes(team) || !target.includes(targetTeam)) return
        const srcIdx = source.indexOf(team)
        const tgtIdx = target.indexOf(targetTeam)
        source[srcIdx] = targetTeam
        target[tgtIdx] = team
      } else if (sourceDivIdx >= 0 && targetDivIdx < 0) {
        const source = divisions[sourceDivIdx]
        if (!source || !source.includes(team) || !unassigned.includes(targetTeam)) return
        const srcIdx = source.indexOf(team)
        source[srcIdx] = targetTeam
      } else if (sourceDivIdx < 0 && targetDivIdx >= 0) {
        const target = divisions[targetDivIdx]
        if (!target || !target.includes(targetTeam) || !unassigned.includes(team) || target.length >= 3) return
        const tgtIdx = target.indexOf(targetTeam)
        target[tgtIdx] = team
      }

      const next: readonly DivisionSlot[] = divisions.map((d) => d as readonly Team[])
      onDivisionAssignmentsChange(next)
      return
    }

    if (!DROPPABLE_IDS.includes(overId as (typeof DROPPABLE_IDS)[number])) return
    if (sourceId === overId) return

    const sourceIsUnassigned = sourceId === UNASSIGNED_ID
    const targetIsUnassigned = overId === UNASSIGNED_ID

    let sourceDivIndex = -1
    if (!sourceIsUnassigned) sourceDivIndex = DIV_IDS.indexOf(sourceId as (typeof DIV_IDS)[number])

    let targetDivIndex = -1
    if (!targetIsUnassigned) targetDivIndex = DIV_IDS.indexOf(overId as (typeof DIV_IDS)[number])

    const divisions = divisionAssignments.map((d) => [...d])

    if (sourceIsUnassigned) {
      const idx = unassigned.indexOf(team)
      if (idx === -1) return
      if (targetIsUnassigned) return
      const target = divisions[targetDivIndex]
      if (!target || target.length >= 3) return
      target.push(team)
    } else if (targetIsUnassigned) {
      const source = divisions[sourceDivIndex]
      if (!source) return
      const idx = source.indexOf(team)
      if (idx === -1) return
      source.splice(idx, 1)
    } else {
      const source = divisions[sourceDivIndex]
      const target = divisions[targetDivIndex]
      if (!source || !target) return
      const srcIdx = source.indexOf(team)
      if (srcIdx === -1) return

      if (target.length < 3) {
        source.splice(srcIdx, 1)
        target.push(team)
      } else {
        const swapIdx = target.findIndex((t) => t !== team)
        if (swapIdx === -1) return
        const swapped = target[swapIdx]
        if (!swapped) return
        source[srcIdx] = swapped
        target[swapIdx] = team
      }
    }

    const next: readonly DivisionSlot[] = divisions.map((d) => d as readonly Team[])
    onDivisionAssignmentsChange(next)
  }

  const isValid = divisionAssignments.every((d) => d.length === 3)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Assign and name divisions</h2>
        <p className="text-muted-foreground mt-2">
          Drag teams into divisions and give each a name. Swap teams by dragging one onto another. Each division holds 3
          teams.
        </p>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          <DroppableArea
            id={UNASSIGNED_ID}
            label="Unassigned"
            teams={unassigned}
            teamNames={teamNames}
            maxTeams={null}
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {DIV_IDS.map((id, i) => (
              <DroppableArea
                key={id}
                id={id}
                label={`Division ${i + 1}`}
                divisionName={divisionNames[i] ?? ''}
                onDivisionNameChange={(value) => handleDivisionNameChange(i, value)}
                teams={divisionAssignments[i] ?? []}
                teamNames={teamNames}
                maxTeams={3}
                showNameInput
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTeam ? <TeamChip team={activeTeam} teamName={teamNames[activeTeam] ?? ''} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-wrap justify-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => onDivisionAssignmentsChange(shuffleTeams())}
          className="rounded-xl border-2 border-primary/50 bg-transparent px-6 py-3 text-base font-semibold text-primary transition-all hover:bg-primary/10 hover:border-primary active:scale-[0.98]"
        >
          Randomize
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!isValid}
          className={cn(
            'rounded-xl px-8 py-3 text-lg font-semibold shadow-lg transition-all',
            isValid
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-100'
              : 'cursor-not-allowed bg-muted text-muted-foreground'
          )}
        >
          {hasExistingSchedule ? 'View schedule' : '✨ Generate schedule'}
        </button>
      </div>
    </div>
  )
}
