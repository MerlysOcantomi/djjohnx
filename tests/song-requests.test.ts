import {describe,expect,it} from "vitest"
import {readFileSync} from "node:fs"
import {amountToCents,buildConfirmationMessage,buildWhatsappUrl,createPrivateToken,createPublicReference,createVCard,hashPrivateToken,isValidPrivateToken,normalizeWhatsapp,roundMessage,songItemsSchema,createPassSchema} from "@/lib/song-requests/domain"
const valid={bizumName:"Ana Pérez",whatsapp:"+34 600 000 000",amount:"1.00",songCount:1}
describe("manual Bizum pass validation",()=>{
 it("accepts the one euro minimum and arbitrary larger amounts",()=>{expect(createPassSchema.parse(valid).amount).toBe(100);expect(createPassSchema.parse({...valid,amount:"100"}).amount).toBe(10000)})
 it("rejects amounts below one euro",()=>expect(createPassSchema.safeParse({...valid,amount:"0.99"}).success).toBe(false))
 it("accepts at most two decimal places",()=>{expect(amountToCents("2,50")).toBe(250);expect(createPassSchema.safeParse({...valid,amount:"2.501"}).success).toBe(false)})
 it("accepts one to five reserved songs",()=>{for(let n=1;n<=5;n++)expect(createPassSchema.safeParse({...valid,songCount:n}).success).toBe(true)})
 it("rejects zero or six songs",()=>{expect(createPassSchema.safeParse({...valid,songCount:0}).success).toBe(false);expect(createPassSchema.safeParse({...valid,songCount:6}).success).toBe(false)})
 it("normalizes WhatsApp",()=>expect(normalizeWhatsapp("600 123 456")).toBe("+34600123456"))
})
describe("private identity",()=>{
 it("creates unique four-digit public references",()=>{const values=new Set(Array.from({length:50},createPublicReference));expect(values.size).toBeGreaterThan(40);for(const value of values)expect(value).toMatch(/^MC-\d{4}$/)})
 it("creates unique long private tokens and hashes",()=>{const a=createPrivateToken(),b=createPrivateToken();expect(a).not.toBe(b);expect(isValidPrivateToken(a)).toBe(true);expect(hashPrivateToken(a)).toMatch(/^[a-f0-9]{64}$/)})
 it("rejects invalid private tokens",()=>expect(isValidPrivateToken("MC-482")).toBe(false))
})
describe("song selection",()=>{
 it("requires exactly the application supplied reserved count",()=>{const three={items:Array.from({length:3},(_,i)=>({title:`Song ${i}`,artist:""}))};expect(songItemsSchema.safeParse(three).success).toBe(true);expect(three.items).toHaveLength(3)})
 it("rejects empty or more than five items",()=>{expect(songItemsSchema.safeParse({items:[]}).success).toBe(false);expect(songItemsSchema.safeParse({items:Array.from({length:6},()=>({title:"x",artist:""}))}).success).toBe(false)})
})
describe("WhatsApp and contact",()=>{
 it("encodes the normalized number and message",()=>{const url=buildWhatsappUrl("600 123 456","Hola MC-4827");expect(url).toContain("wa.me/34600123456");expect(url).toContain("Hola%20MC-4827")})
 it("includes reference and private URL in confirmation",()=>{const message=buildConfirmationMessage({name:"Ana",reference:"MC-4827",songCount:3,privateUrl:"https://djjohnx.com/mi-cancion/pase/private"});expect(message).toContain("MC-4827");expect(message).toContain("/pase/private");expect(message).toContain("3 canciones")})
 it("builds a valid escaped vCard",()=>{const card=createVCard("DJ John, Bizum","+34600123456");expect(card).toContain("BEGIN:VCARD\r\nVERSION:3.0");expect(card).toContain("DJ John\\, Bizum");expect(card).toContain("TEL;TYPE=CELL:+34600123456");expect(card).toContain("END:VCARD")})
})
describe("round and security contracts",()=>{
 const data=readFileSync("lib/song-requests/data.ts","utf8"),migration=readFileSync("db/migrations/0003_song_requests.sql","utf8"),live=readFileSync("app/mi-cancion/live/page.tsx","utf8"),webhookPath="app/api/song-requests/webhook/route.ts"
 it("has all public round messages",()=>{for(const s of ["paused","full","last_round","closed"])expect(roundMessage(s)).toBeTruthy()})
 it("reserves capacity atomically before exposing payment instructions",()=>{expect(data).toContain("WITH available_round AS");expect(data).toContain("reserved_slots=r.reserved_slots+");expect(data).toContain("r.reserved_slots+");expect(data).toContain("<=r.capacity");expect(data.indexOf("UPDATE song_request_rounds")).toBeLessThan(data.indexOf("INSERT INTO song_requests"))})
 it("reporting payment does not reserve the same capacity twice",()=>{const report=data.slice(data.indexOf("export async function reportManualPayment"),data.indexOf("export async function confirmManualPayment"));expect(report).not.toContain("UPDATE song_request_rounds");expect(report).toContain("status='payment_reported'")})
 it("releases reservations for terminal failures",()=>{expect(data).toContain('"payment_not_found"|"cancelled"|"expired"');expect(data).toContain("reserved_slots=GREATEST(0")})
 it("only confirms reported manual Bizum and is idempotent",()=>{expect(data).toContain("payment_mode='manual_bizum'");expect(data).toContain("status IN ('payment_reported','song_selection_open')")})
 it("stores songs relationally and preserves future Spotify fields",()=>{expect(migration).toContain("CREATE TABLE IF NOT EXISTS song_request_items");expect(migration).toContain("spotify_track_id");expect(migration).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE)\b/im)})
 it("has no public webhook and live contains no private fields",()=>{expect(()=>readFileSync(webhookPath)).toThrow();expect(live).not.toMatch(/whatsapp|bizum_name|amount_cents|public_reference|private_token/)})
 it("keeps the QR stable",()=>expect(live).toContain("`${base}/mi-cancion`"))
 it("accepts normalized plus-prefixed phones and scopes references per round",()=>{expect(migration).toContain("whatsapp_number ~ '^[+][1-9][0-9]{7,14}$'");expect(migration).toContain("UNIQUE(round_id,public_reference)");expect(migration).toContain("^MC-[0-9]{4}$")})
 it("expires unpaid and reported passes",()=>{expect(data).toContain("status IN ('pending_manual_payment','payment_reported')");expect(data).toContain("expires_at<=now()")})
 it("preserves last round after becoming full",()=>{expect(migration).toContain("reopen_status");expect(data).toContain("THEN r.reopen_status")})
 it("uses a shared atomic database rate limit",()=>{const rate=readFileSync("lib/song-requests/rate-limit.ts","utf8");expect(rate).toContain("song_request_rate_limits");expect(rate).toContain("ON CONFLICT (ip_hash) DO UPDATE");expect(rate).toContain("createHmac")})
 it("prints the live poster and stops repeated reduced-motion animation",()=>{const css=readFileSync("app/globals.css","utf8");expect(live).toContain("print-poster");expect(css).toContain("animation-iteration-count: 1 !important")})
 it("renders the configured minimum dynamically",()=>{const page=readFileSync("app/mi-cancion/page.tsx","utf8");expect(page).toContain("config.minAmountCents");expect(page).toContain("desde {minimum}")})
 it("keeps paid passes accessible and terminal states away from payment instructions",()=>{const page=readFileSync("app/mi-cancion/pase/[token]/page.tsx","utf8"),view=readFileSync("components/song-requests/pass-view.tsx","utf8");expect(page).not.toContain("!config.available)notFound");for(const state of ["expired","payment_not_found","cancelled","archived"])expect(view).toContain(state);expect(view.indexOf("terminal[pass.status]")).toBeLessThan(view.indexOf("Contacto Bizum"));expect(view).toContain("Este pase no admite nuevos pagos")})
 it("decrypts before confirmation and supports WhatsApp resend",()=>{const actions=readFileSync("app/actions/song-requests.ts","utf8"),admin=readFileSync("components/admin/song-requests-manager.tsx","utf8");expect(actions.indexOf("prepareWhatsApp(id")).toBeLessThan(actions.indexOf("confirmManualPayment(id"));expect(actions).toContain("resendManualBizumWhatsAppAction");expect(admin).toContain("Avisar nuevamente por WhatsApp");expect(admin).toContain("window.open('about:blank'")})
})
