import { NextRequest, NextResponse } from "next/server";
import { downloadFileFromDrive } from "@/lib/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const { mimeType, bytes } = await downloadFileFromDrive(params.fileId);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        // Se puede cachear tranquilamente: el nombre del archivo en Drive
        // incluye la marca de tiempo, así que un mismo fileId siempre
        // corresponde al mismo contenido.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el archivo de Drive." },
      { status: 502 }
    );
  }
}
