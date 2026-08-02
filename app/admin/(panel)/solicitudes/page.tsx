import {SongRequestsManager} from "@/components/admin/song-requests-manager"
import {getActiveRound,listAllItems,listPasses,listRounds} from "@/lib/song-requests/data"
import {getManualBizumConfig} from "@/lib/song-requests/config"
export const dynamic="force-dynamic"
export default async function Page(){const[active,rounds,passes,items]=await Promise.all([getActiveRound(),listRounds(),listPasses(),listAllItems()]);return <SongRequestsManager active={active} rounds={rounds} passes={passes} items={items} config={getManualBizumConfig()}/>}
