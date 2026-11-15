"use client"

import { createContext, useContext, useEffect, useRef } from "react"

export type SequenceOrientation = "landscape" | "portrait"

export type SequenceFrame = {
  /** Posicion de la camara en el recorrido, 0..1 (ya amortiguada). */
  progress: number
  /** Velocidad con signo, en fraccion del recorrido por segundo. */
  speed: number
  /** Tamano del stage en px. */
  width: number
  height: number
  orientation: SequenceOrientation
  reducedMotion: boolean
  /** Px de la parte baja del stage ocupados por interfaz (los accesos). */
  clearBottom: number
}

export type SequenceStore = {
  subscribe: (listener: (frame: SequenceFrame) => void) => () => void
  getFrame: () => SequenceFrame
}

/** Lo que controla el recorrido ademas de leerlo. */
export type JourneyController = SequenceStore & {
  /**
   * Avanza el recorrido `dt` segundos y avisa a los suscriptores. Lo llama el
   * bucle de render: si el lienzo esta detenido, el recorrido tambien.
   */
  advance: (dt: number) => SequenceFrame
  /** Avance rapido hasta el final. */
  skip: () => void
  setClearBottom: (pixels: number) => void
}

export const INITIAL_FRAME: SequenceFrame = {
  progress: 0,
  speed: 0,
  width: 1440,
  height: 900,
  orientation: "landscape",
  reducedMotion: false,
  clearBottom: 0,
}

export const SequenceContext = createContext<JourneyController | null>(null)

export function useJourney() {
  const controller = useContext(SequenceContext)
  if (!controller) throw new Error("Los hooks de secuencia deben usarse dentro de <JourneyStage>.")
  return controller
}

/**
 * Ejecuta `onFrame` en cada fotograma de la secuencia sin re-renderizar React.
 * Los componentes escriben sus estilos directamente en refs del DOM.
 */
export function useSequenceFrame(onFrame: (frame: SequenceFrame) => void) {
  const controller = useJourney()
  const callback = useRef(onFrame)

  useEffect(() => {
    callback.current = onFrame
  })

  useEffect(() => {
    const unsubscribe = controller.subscribe((frame) => callback.current(frame))
    callback.current(controller.getFrame())
    return unsubscribe
  }, [controller])
}
