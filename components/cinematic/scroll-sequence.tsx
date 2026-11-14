"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { clamp } from "@/lib/cinematic/math"
import {
  INITIAL_FRAME,
  SequenceContext,
  type SequenceFrame,
  type SequenceStore,
} from "./sequence-context"

type ScrollSequenceProps = {
  ariaLabel: string
  id?: string
  /** Clase del track: define su altura (cuanto scroll dura la secuencia). */
  className?: string
  /** 0 = scroll crudo; mas alto = camara mas pesada. Se ignora con movimiento reducido. */
  smoothing?: number
  children: ReactNode
}

function createStore(): SequenceStore & { emit: (frame: SequenceFrame) => void } {
  const listeners = new Set<(frame: SequenceFrame) => void>()
  let frame = INITIAL_FRAME
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getFrame: () => frame,
    emit(next) {
      frame = next
      listeners.forEach((listener) => listener(next))
    },
  }
}

/**
 * Motor de scroll cinematografico (mismos principios que el ScrollSequence de
 * DJ-Canet): un track largo contiene un stage `sticky` a pantalla completa. La
 * posicion de scroll se convierte en un progreso 0..1 que se suaviza con un
 * amortiguador independiente de los fps. Todo lo que hay dentro es funcion pura
 * de ese valor, asi que hacer scroll hacia atras reproduce el recorrido al
 * reves. El bucle rAF solo corre mientras el valor se mueve.
 */
export function ScrollSequence({
  ariaLabel,
  id,
  className,
  smoothing = 9,
  children,
}: ScrollSequenceProps) {
  const trackRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [store] = useState(createStore)

  useEffect(() => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reducedMotion = motionQuery.matches
    let width = stage.clientWidth
    let height = stage.clientHeight
    let scrollable = Math.max(0, track.offsetHeight - height)
    let target = 0
    let current = -1
    let raf: number | null = null
    let last = 0

    const readTarget = () => {
      const rect = track.getBoundingClientRect()
      target = scrollable <= 0 ? 0 : clamp(-rect.top / scrollable)
    }

    const emit = () => {
      store.emit({
        progress: current,
        width,
        height,
        scrollable,
        orientation: width / Math.max(1, height) < 1 ? "portrait" : "landscape",
        reducedMotion,
      })
    }

    const tick = (now: number) => {
      raf = null
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
      last = now

      if (current < 0 || reducedMotion || smoothing <= 0) {
        current = target
      } else {
        current += (target - current) * (1 - Math.exp(-smoothing * dt))
        if (Math.abs(target - current) < 0.00005) current = target
      }

      emit()
      if (current !== target) raf = requestAnimationFrame(tick)
      else last = 0
    }

    const schedule = () => {
      readTarget()
      if (raf === null) raf = requestAnimationFrame(tick)
    }

    const onResize = () => {
      width = stage.clientWidth
      height = stage.clientHeight
      scrollable = Math.max(0, track.offsetHeight - height)
      readTarget()
      current = target
      emit()
    }

    const onMotionChange = () => {
      reducedMotion = motionQuery.matches
      onResize()
    }

    const observer = new ResizeObserver(onResize)
    observer.observe(stage)
    observer.observe(track)
    window.addEventListener("scroll", schedule, { passive: true })
    motionQuery.addEventListener("change", onMotionChange)
    schedule()

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", schedule)
      motionQuery.removeEventListener("change", onMotionChange)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [store, smoothing])

  return (
    <SequenceContext.Provider value={store}>
      <section
        ref={trackRef}
        id={id}
        aria-label={ariaLabel}
        className={`cine-track relative ${className ?? ""}`}
      >
        <div ref={stageRef} className="cine-stage">
          {children}
        </div>
      </section>
    </SequenceContext.Provider>
  )
}
