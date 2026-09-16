import { createContext } from 'react'

export interface WellnessState {
  healthDeviceId: string | null
  city: string
  setHealthDeviceId: (id: string | null) => void
  setCity: (city: string) => void
}

export const WellnessStateContext = createContext<WellnessState | undefined>(undefined)
