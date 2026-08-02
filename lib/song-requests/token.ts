import "server-only"
import { createCipheriv,createDecipheriv,createHash,randomBytes } from "node:crypto"
function key(){const secret=process.env.SONG_REQUEST_TOKEN_SECRET;if(!secret)throw new Error("SONG_REQUEST_TOKEN_SECRET_MISSING");return createHash("sha256").update(secret).digest()}
export function encryptToken(token:string){const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key(),iv);const encrypted=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url")}
export function decryptToken(value:string){const data=Buffer.from(value,"base64url");const decipher=createDecipheriv("aes-256-gcm",key(),data.subarray(0,12));decipher.setAuthTag(data.subarray(12,28));return Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString("utf8")}
