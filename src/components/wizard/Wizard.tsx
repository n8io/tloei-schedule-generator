import { useWizardState } from '@/hooks/useWizardState'
import type { DivisionSlot, WizardState } from '@/types/wizard'
import { DivisionsStep } from './DivisionsStep'
import { useEffect } from 'react'

type WizardProps = {
  onComplete: (state: WizardState) => void
  hasExistingSchedule: boolean
  onNavigateToSchedule: (state: WizardState) => void
  onWizardStateChange?: (state: WizardState) => void
}

const STEP_LABELS = ['Set up divisions', 'Generate']

export function Wizard({ onComplete, hasExistingSchedule, onNavigateToSchedule, onWizardStateChange }: WizardProps) {
  const { state, setState } = useWizardState()

  useEffect(() => {
    onWizardStateChange?.(state)
  }, [state, onWizardStateChange])

  const handleDivisionAssignmentsChange = (assignments: readonly DivisionSlot[]) => {
    setState((prev) => ({
      ...prev,
      divisionAssignments: assignments,
    }))
  }

  const handleDivisionNamesChange = (names: [string, string, string, string]) => {
    setState((prev) => ({
      ...prev,
      divisionNames: names,
    }))
  }

  const handleGenerate = () => {
    setState((prev) => ({ ...prev, step: 2 }))
    if (hasExistingSchedule) {
      onNavigateToSchedule(state)
    } else {
      onComplete(state)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex justify-center gap-2" role="tablist" aria-label="Wizard steps">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as 1 | 2
          const isActive = state.step === stepNum
          const isPast = state.step > stepNum
          const isClickable = stepNum <= 1
          return (
            <button
              key={label}
              type="button"
              onClick={() => isClickable && setState((prev) => ({ ...prev, step: stepNum }))}
              disabled={!isClickable}
              role="tab"
              aria-selected={isActive}
              aria-label={`Step ${stepNum}: ${label}`}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : ''
              } ${isPast ? 'bg-primary/20 text-primary' : ''} ${
                !isActive && !isPast ? 'bg-muted text-muted-foreground' : ''
              } ${isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
            >
              <span className="size-5 rounded-full bg-current/30 flex items-center justify-center text-xs">
                {stepNum}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {state.step === 1 && (
        <DivisionsStep
          divisionAssignments={state.divisionAssignments}
          divisionNames={state.divisionNames}
          teamNames={state.teamNames}
          onDivisionAssignmentsChange={handleDivisionAssignmentsChange}
          onDivisionNamesChange={handleDivisionNamesChange}
          onGenerate={handleGenerate}
          hasExistingSchedule={hasExistingSchedule}
        />
      )}
    </div>
  )
}
