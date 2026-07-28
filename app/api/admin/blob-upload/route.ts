import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { type NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"]

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Verificar sesion antes de permitir la subida
        if (!(await isAuthenticated())) {
          throw new Error("No autorizado")
        }
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // No-op: los metadatos se guardan desde la Server Action tras la subida
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
