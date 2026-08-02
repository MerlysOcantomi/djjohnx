import { notFound } from "next/navigation"
import { PaymentResult } from "@/components/song-requests/payment-result"
import { getSongRequest } from "@/lib/song-requests/data"
import { publicPaymentState } from "@/lib/song-requests/domain"
export const dynamic="force-dynamic"
export default async function ThanksPage({searchParams}:{searchParams:Promise<{id?:string}>}){const {id}=await searchParams;if(!id)notFound();let item;try{item=await getSongRequest(id)}catch{item=null}if(!item)notFound();return <PaymentResult id={id} initial={publicPaymentState(item.payment_status)}/>}
