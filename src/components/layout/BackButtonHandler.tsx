'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export default function BackButtonHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let activo = true
    let remover: (() => Promise<void>) | undefined
    void App.addListener('backButton', ({ canGoBack }) => {
      if (!activo) return
      if (canGoBack && window.history.length > 1) window.history.back()
      else router.replace('/dashboard')
    }).then((listener) => { remover = () => listener.remove() })
    return () => { activo = false; void remover?.() }
  }, [router])

  return null
}
