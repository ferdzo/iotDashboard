import { useContext } from 'react'
import { WellnessStateContext } from './wellness-context'

export function useWellnessState() {
  const context = useContext(WellnessStateContext)
  if (context === undefined) {
    throw new Error('useWellnessState must be used within WellnessStateProvider')
  }
  return context
}
