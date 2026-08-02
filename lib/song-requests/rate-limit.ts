const attempts = new Map<string,{count:number;reset:number}>()
export function checkSongRequestRateLimit(key:string, now=Date.now()) { const current=attempts.get(key); if(!current||current.reset<=now){attempts.set(key,{count:1,reset:now+60_000});return true} if(current.count>=5)return false; current.count++; return true }
