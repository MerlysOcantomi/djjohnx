"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  DEFAULT_JOURNEY,
  createJourneyState,
  skipJourney,
  stepJourney,
  type JourneyConfig,
} from "@/lib/cinematic/journey"
import {
  INITIAL_FRAME,
  SequenceContext,
  type JourneyController,
  type SequenceFrame,
} from "./sequence-context"

type JourneyOptions = {
  /** false = sin avance automatico (el recorrido solo responde al visitante). */
  auto: boolean
  /** Ritmo de paseo (fraccion del recorrido por segundo) para este tamano de pantalla. */
  cruise: (width: number, height: number) => number
  /** Altos de pantalla de rueda o arrastre que equivalen al recorrido completo. */
  screens: (width: number, height: number) => number
}

type JourneyStageProps = JourneyOptions & {
  className?: string
  children: ReactNode
}

/** Px por "linea" cuando la rueda informa en lineas (Firefox). */
const WHEEL_LINE = 40
const KEY_STEP = 0.045
const PAGE_STEP = 0.16

type Internals = JourneyController & {
  input: { delta: number; holding: boolean; fling: number | undefined }
  resize: (width: number, height: number, reducedMotion: boolean) => void
}

function createController(options: { current: JourneyOptions }): Internals {
  const listeners = new Set<(frame: SequenceFrame) => void>()
  const config: JourneyConfig = { ...DEFAULT_JOURNEY, cruise: 0.06 }
  const state = createJourneyState(config)
  const input: Internals["input"] = { delta: 0, holding: false, fling: undefined }
  let frame = INITIAL_FRAME

  const emit = (next: SequenceFrame) => {
    frame = next
    listeners.forEach((listener) => listener(next))
    return next
  }

  return {
    input,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getFrame: () => frame,
    advance(dt) {
      config.cruise = options.current.cruise(frame.width, frame.height)
      stepJourney(state, config, input, dt, options.current.auto)
      input.delta = 0
      input.fling = undefined
      return emit({ ...frame, progress: state.position, speed: state.speed })
    },
    skip: () => skipJourney(state),
    setClearBottom(pixels) {
      if (pixels !== frame.clearBottom) emit({ ...frame, clearBottom: pixels })
    },
    resize(width, height, reducedMotion) {
      emit({
        ...frame,
        width,
        height,
        reducedMotion,
        orientation: width / Math.max(1, height) < 1 ? "portrait" : "landscape",
      })
    },
  }
}

/**
 * Escenario a pantalla completa cuyo recorrido avanza solo y, ademas, obedece
 * al visitante. Sigue los principios del ScrollSequence de DJ-Canet (un unico
 * progreso 0..1 amortiguado; todo lo que hay dentro es funcion de ese valor y
 * por tanto reversible), pero la pagina no se desplaza: la rueda, el dedo y el
 * teclado mueven la camara directamente. Asi el avance automatico y el manual
 * comparten una sola posicion y no puede haber saltos entre ambos.
 */
export function JourneyStage({ className, children, ...options }: JourneyStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const latest = useRef<JourneyOptions>(options)
  const [controller] = useState(() => createController(latest))

  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const { input } = controller
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    /** Fraccion del recorrido que supone desplazarse `pixels`. */
    const toProgress = (pixels: number) => {
      const { width, height } = controller.getFrame()
      return pixels / (Math.max(1, height) * latest.current.screens(width, height))
    }

    const measure = () => controller.resize(stage.clientWidth, stage.clientHeight, motionQuery.matches)

    const onWheel = (event: WheelEvent) => {
      // Ctrl + rueda es el zoom del navegador (y el pellizco del trackpad).
      if (event.ctrlKey) return
      const height = controller.getFrame().height
      const pixels =
        event.deltaMode === 1 ? event.deltaY * WHEEL_LINE : event.deltaMode === 2 ? event.deltaY * height : event.deltaY
      input.delta += toProgress(Math.max(-height, Math.min(height, pixels)))
    }

    // Arrastre con el dedo: hacia arriba avanza, como al hacer scroll.
    const touch = { id: -1, y: 0, time: 0, velocity: 0 }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || !event.isPrimary) return
      touch.id = event.pointerId
      touch.y = event.clientY
      touch.time = event.timeStamp
      touch.velocity = 0
      input.holding = true
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== touch.id) return
      const delta = toProgress(touch.y - event.clientY)
      const elapsed = Math.max(1, event.timeStamp - touch.time) / 1000
      touch.velocity = touch.velocity * 0.4 + (delta / elapsed) * 0.6
      touch.y = event.clientY
      touch.time = event.timeStamp
      input.delta += delta
    }
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== touch.id) return
      touch.id = -1
      input.holding = false
      // Solo hay inercia si el dedo se suelta en movimiento.
      if (event.type === "pointerup" && event.timeStamp - touch.time < 90) input.fling = touch.velocity
    }

    // Si la pestana se oculta con el dedo apoyado, no puede quedarse "pulsado".
    const onVisibility = () => {
      if (document.visibilityState === "visible") return
      touch.id = -1
      input.holding = false
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      const onControl = event.target instanceof Element && event.target.closest("a, button, input, textarea, select")
      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          input.delta += KEY_STEP
          break
        case "ArrowUp":
        case "ArrowLeft":
          input.delta -= KEY_STEP
          break
        case "PageDown":
          input.delta += PAGE_STEP
          break
        case "PageUp":
          input.delta -= PAGE_STEP
          break
        case " ":
          // En un enlace o boton, el espacio lo activa: no se toca.
          if (!onControl) input.delta += event.shiftKey ? -PAGE_STEP : PAGE_STEP
          break
        case "End":
          controller.skip()
          break
        case "Home":
          input.delta -= 1
          break
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    measure()
    window.addEventListener("wheel", onWheel, { passive: true })
    stage.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerEnd)
    window.addEventListener("pointercancel", onPointerEnd)
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("visibilitychange", onVisibility)
    motionQuery.addEventListener("change", measure)

    return () => {
      observer.disconnect()
      window.removeEventListener("wheel", onWheel)
      stage.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerEnd)
      window.removeEventListener("pointercancel", onPointerEnd)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("visibilitychange", onVisibility)
      motionQuery.removeEventListener("change", measure)
    }
  }, [controller])

  return (
    <SequenceContext.Provider value={controller}>
      <div ref={stageRef} className={`cine-stage ${className ?? ""}`}>
        {children}
      </div>
    </SequenceContext.Provider>
  )
}
