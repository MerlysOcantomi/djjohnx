"use client"

import { Music, Music2, Music3, Music4 } from "lucide-react"

const notes = [
  { Icon: Music, delay: "0s", duration: "8s", left: "5%", top: "20%" },
  { Icon: Music2, delay: "2s", duration: "10s", left: "15%", top: "60%" },
  { Icon: Music3, delay: "4s", duration: "7s", left: "85%", top: "30%" },
  { Icon: Music4, delay: "1s", duration: "9s", left: "90%", top: "70%" },
  { Icon: Music, delay: "3s", duration: "11s", left: "75%", top: "15%" },
  { Icon: Music2, delay: "5s", duration: "8s", left: "25%", top: "80%" },
  { Icon: Music3, delay: "2.5s", duration: "9s", left: "60%", top: "85%" },
  { Icon: Music4, delay: "4.5s", duration: "10s", left: "40%", top: "10%" },
]

export function FloatingNotes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {notes.map((note, index) => (
        <div
          key={index}
          className="absolute animate-float opacity-20"
          style={{
            left: note.left,
            top: note.top,
            animationDelay: note.delay,
            animationDuration: note.duration,
          }}
        >
          <note.Icon className="h-6 w-6 text-primary md:h-8 md:w-8" />
        </div>
      ))}
    </div>
  )
}
