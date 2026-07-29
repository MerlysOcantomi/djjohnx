import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

/**
 * Los Client Components del panel reciben los datos del Server Component y
 * los refrescan con router.refresh(). Copiarlos a useState los congela con
 * los props iniciales: el registro se guarda en Neon, pero la lista sigue
 * mostrando los datos viejos hasta recargar la pagina a mano.
 *
 * Eso ocurrio con la lista de trabajos:
 *
 *   const [jobs] = useState<Job[]>(initialJobs)   // <- congelado
 *
 * Un useState sin setter no se puede actualizar nunca, asi que en un
 * componente que recibe datos del servidor es siempre un error: o los datos
 * se usan directamente, o hace falta un setter que los sincronice.
 */

const ADMIN_DIR = join(process.cwd(), "components/admin")

function adminComponents(): string[] {
  return readdirSync(ADMIN_DIR).filter((f) => f.endsWith(".tsx"))
}

/** Coincide con `const [algo] = useState(...)`, sin segundo elemento. */
const SETTERLESS_USE_STATE = /const\s*\[\s*[A-Za-z_$][\w$]*\s*\]\s*=\s*useState[<(]/

/** Coincide con `useState(...)` inicializado desde un prop del servidor. */
const USE_STATE_FROM_PROP = /useState\s*(?:<[^>]*>)?\s*\(\s*(initial[A-Z]\w*|props\.\w+)/

describe("los Client Components no congelan los datos del servidor", () => {
  const files = adminComponents()

  it("hay componentes de administracion que revisar", () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const source = readFileSync(join(ADMIN_DIR, file), "utf8")
    if (!source.includes('"use client"')) continue

    it(`${file} no usa useState sin setter`, () => {
      const offenders = source
        .split("\n")
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => SETTERLESS_USE_STATE.test(line))
        .map(({ line, n }) => `${file}:${n} ${line}`)
      expect(offenders).toEqual([])
    })

    it(`${file} solo copia props del servidor a useState si puede sincronizarlos`, () => {
      const offenders = source
        .split("\n")
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => USE_STATE_FROM_PROP.test(line) && SETTERLESS_USE_STATE.test(line))
        .map(({ line, n }) => `${file}:${n} ${line}`)
      expect(offenders).toEqual([])
    })
  }
})

describe("la lista de trabajos se refresca sola", () => {
  const source = readFileSync(join(ADMIN_DIR, "jobs-manager.tsx"), "utf8")

  it("usa initialJobs directamente, sin copiarlo a estado", () => {
    expect(source).toMatch(/const\s+jobs\s*=\s*initialJobs/)
    expect(source).not.toMatch(/useState<Job\[\]>\s*\(\s*initialJobs/)
  })

  it("toda mutacion refresca la vista", () => {
    // Cada handler que llama a una Server Action tiene que pedir el refresco,
    // porque ya no hay estado local que actualizar de forma optimista.
    const handlers = ["save", "changeStatus", "submitPayment", "fullyPaid", "confirmDelete"]
    for (const name of handlers) {
      const start = source.indexOf(`function ${name}(`)
      expect(start, `falta el handler ${name}`).toBeGreaterThan(-1)
      const nextFn = source.indexOf("\n  function ", start + 1)
      const body = source.slice(start, nextFn === -1 ? source.length : nextFn)
      expect(body, `${name} no llama a router.refresh()`).toContain("router.refresh()")
    }
  })

  it("limpia el parametro de la URL para no reabrir el dialogo en cada refresco", () => {
    expect(source).toContain('router.replace("/admin/trabajos"')
  })
})
