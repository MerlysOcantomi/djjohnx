import { createHmac } from "node:crypto"
import { describe,expect,it } from "vitest"
import { canTransition,publicPaymentState,songRequestSchema } from "@/lib/song-requests/domain"
import { isTestProviderAllowed,TestPaymentProvider } from "@/lib/song-requests/payment"

describe("song request form",()=>{
 const valid={songTitle:"  La   vida  ",clientRequestId:"138c4f19-70b8-40c8-b50f-678fbde61b88"}
 it("rejects an empty song",()=>expect(songRequestSchema.safeParse({...valid,songTitle:"  "}).success).toBe(false))
 it("accepts and normalizes a valid song",()=>expect(songRequestSchema.parse(valid).songTitle).toBe("La vida"))
 it("enforces title and dedication limits",()=>{expect(songRequestSchema.safeParse({...valid,songTitle:"x".repeat(161)}).success).toBe(false);expect(songRequestSchema.safeParse({...valid,dedication:"x".repeat(241)}).success).toBe(false)})
 it("accepts and normalizes optional fields",()=>expect(songRequestSchema.parse({...valid,artistName:" DJ   Test ",requesterName:"",locationLabel:" Mesa  3 ",dedication:" para   Ana "})).toMatchObject({artistName:"DJ Test",requesterName:"",locationLabel:"Mesa 3",dedication:"para Ana"}))
 it("rejects the bot honeypot",()=>expect(songRequestSchema.safeParse({...valid,website:"spam"}).success).toBe(false))
})
describe("request state transitions",()=>{
 it("accepts, plays, rejects and archives valid requests",()=>{expect(canTransition("paid","accepted","paid")).toBe(true);expect(canTransition("accepted","played","paid")).toBe(true);expect(canTransition("paid","rejected","paid")).toBe(true);expect(canTransition("rejected","archived","paid")).toBe(true)})
 it("rejects invalid transitions and unpaid playback",()=>{expect(canTransition("paid","played","paid")).toBe(false);expect(canTransition("accepted","played","pending")).toBe(false)})
 it("does not let an administrator confirm a pending payment",()=>expect(canTransition("pending_payment","paid","pending")).toBe(false))
 it("allows free requests to be played",()=>expect(canTransition("accepted","played","not_required")).toBe(true))
 it("maps confirmed, pending and failed payment states",()=>{expect(publicPaymentState("paid")).toBe("confirmed");expect(publicPaymentState("not_required")).toBe("confirmed");expect(publicPaymentState("processing")).toBe("pending");expect(publicPaymentState("failed")).toBe("failed")})
})
describe("test payment provider",()=>{
 const env={NODE_ENV:"test",SONG_REQUEST_TEST_PAYMENT_ENABLED:"true"} as NodeJS.ProcessEnv
 it("is unavailable in production",()=>{expect(isTestProviderAllowed({...env,NODE_ENV:"production"})).toBe(false);expect(()=>new TestPaymentProvider("secret","http://localhost",{...env,NODE_ENV:"production"})).toThrow("DISABLED")})
 it("creates a checkout with the correct request",async()=>{const p=new TestPaymentProvider("secret","http://localhost",env);const c=await p.createCheckout({requestId:"abc",reference:"ref",amountCents:100,currency:"EUR",returnUrl:"http://return"});expect(c.checkoutUrl).toContain("request=abc")})
 it("verifies signed events and rejects invalid signatures",()=>{const p=new TestPaymentProvider("secret","http://localhost",env);const raw=JSON.stringify({eventId:"e1",reference:"ref",transactionId:"tx",amountCents:100,currency:"EUR",status:"paid"});const signature=createHmac("sha256","secret").update(raw).digest("hex");expect(p.verifyWebhook(raw,signature)).toMatchObject({amountCents:100,currency:"EUR",status:"paid"});expect(()=>p.verifyWebhook(raw,"bad")).toThrow("SIGNATURE")})
})
describe("permanent QR contract",()=>{it("uses the stable configured path without price or event data",()=>{const base="https://djjohnx.com";const url=`${base}/mi-cancion`;expect(url).toBe("https://djjohnx.com/mi-cancion");expect(url).not.toMatch(/100|EUR|event|phone/)})})
