"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { correctSpanishText } from "@/app/actions/text-correction"
import { cn } from "@/lib/utils"

type TextareaProps = React.ComponentProps<"textarea"> & {
  aiCorrection?: boolean
}

function Textarea({
  className,
  lang = "es",
  spellCheck = true,
  autoCorrect = "on",
  autoCapitalize = "sentences",
  aiCorrection = true,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: TextareaProps) {
  const [pending, startTransition] = React.useTransition()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const currentText =
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : textareaRef.current?.value ?? ""

  function applyCorrectedText(corrected: string) {
    if (textareaRef.current) textareaRef.current.value = corrected

    if (onChange) {
      const target = textareaRef.current ?? ({ value: corrected } as HTMLTextAreaElement)
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLTextAreaElement>)
    }
  }

  function correct() {
    const text =
      typeof value === "string"
        ? value
        : textareaRef.current?.value ?? (typeof defaultValue === "string" ? defaultValue : "")

    if (!text.trim()) {
      toast.error("Escribe un texto antes de corregirlo")
      return
    }

    startTransition(async () => {
      try {
        const result = await correctSpanishText({ text })
        applyCorrectedText(result.text)
        toast.success("Texto corregido")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo corregir el texto")
      }
    })
  }

  return (
    <div className="space-y-1.5" data-slot="correctable-textarea">
      <textarea
        ref={textareaRef}
        lang={lang}
        spellCheck={spellCheck}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        data-slot="textarea"
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      {aiCorrection && (
        <button
          type="button"
          onClick={correct}
          disabled={disabled || pending || !currentText.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {pending ? "Corrigiendo..." : "Corregir texto"}
        </button>
      )}
    </div>
  )
}

export { Textarea }
