"use client"

import { createContext, useContext, useEffect, useRef } from "react"

export type SequenceOrientation = "landscape" | "portrait"

export type SequenceFrame = {
  /** Progreso suavizado a lo largo del track, 0..1. */
  progress: number
  /** Tamano del stage en px. */
  width: number
  height: number
  /** Px de scroll que recorre el track mientras el stage esta fijado. */
  scrollable: number
  orientation: SequenceOrientation
  reducedMotion: boolean
}

export type SequenceStore = {
  subscribe: (listener: (frame: SequenceFrame) => void) => () => void
  getFrame: () => SequenceFrame
}

export const INITIAL_FRAME: SequenceFrame = {
  progress: 0,
  width: 1440,
  height: 900,
  scrollable: 0,
  orientation: "landscape",
  reducedMotion: false,
}

export const SequenceContext = createContext<SequenceStore | null>(null)

export function useSequenceStore() {
  const store = useContext(SequenceContext)
  if (!store) throw new Error("Los hooks de secuencia deben usarse dentro de <ScrollSequence>.")
  return store
}

/**
 * Ejecuta `onFrame` en cada fotograma de la secuencia sin re-renderizar React.
 * Los componentes escriben sus estilos directamente en refs del DOM.
 */
export function useSequenceFrame(onFrame: (frame: SequenceFrame) => void) {
  const store = useSequenceStore()
  const callback = useRef(onFrame)

  useEffect(() => {
    callback.current = onFrame
  })

  useEffect(() => {
    const unsubscribe = store.subscribe((frame) => callback.current(frame))
    callback.current(store.getFrame())
    return unsubscribe
  }, [store])
}
