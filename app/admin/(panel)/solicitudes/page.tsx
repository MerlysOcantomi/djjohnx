import { SongRequestsManager } from "@/components/admin/song-requests-manager"
import { getSongRequestSettings,listSongRequests } from "@/lib/song-requests/data"
export const dynamic="force-dynamic"
export default async function RequestsAdminPage(){const [settings,requests]=await Promise.all([getSongRequestSettings(),listSongRequests()]);const base=(process.env.NEXT_PUBLIC_APP_URL||"https://djjohnx.com").replace(/\/$/,"");return <SongRequestsManager initialSettings={settings} requests={requests} qrUrl={`${base}/mi-cancion`}/>}
