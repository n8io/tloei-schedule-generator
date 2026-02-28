import { clearWizardState, getInitialWizardState, loadWizardState, saveWizardState } from '@/lib/wizard-storage'
import type { WizardState } from '@/types/wizard'
import { useCallback, useState } from 'react'

export function useWizardState() {
  const [state, setStateInternal] = useState<WizardState>(() => {
    const loaded = loadWizardState()
    if (loaded) return loaded
    return getInitialWizardState()
  })

  const setState = useCallback((updater: WizardState | ((prev: WizardState) => WizardState)) => {
    setStateInternal((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveWizardState(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    clearWizardState()
    setStateInternal(getInitialWizardState())
  }, [])

  return { state, setState, reset }
}
