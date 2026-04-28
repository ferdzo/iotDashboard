import { createContext, useContext, useState, type ReactNode } from 'react'

interface WellnessState {
  healthDeviceId: string | null
  city: string
  setHealthDeviceId: (id: string | null) => void
  setCity: (city: string) => void
}

const WellnessStateContext = createContext<WellnessState | undefined>(undefined)

export function WellnessStateProvider({ children }: { children: ReactNode }) {
  const [healthDeviceId, setHealthDeviceId] = useState<string | null>(null)
  const [city, setCity] = useState<string>('Skopje')

  return (
    <WellnessStateContext.Provider
      value={{
        healthDeviceId,
        city,
        setHealthDeviceId,
        setCity,
      }}
    >
      {children}
    </WellnessStateContext.Provider>
  )
}

export function useWellnessState() {
  const context = useContext(WellnessStateContext)
  if (context === undefined) {
    throw new Error('useWellnessState must be used within WellnessStateProvider')
  }
  return context
}




