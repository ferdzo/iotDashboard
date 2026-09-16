import { useState, type ReactNode } from 'react'
import { WellnessStateContext } from './wellness-context'

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




