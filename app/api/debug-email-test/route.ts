import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendInvitacionMicrosoftEmail } from "@/lib/email";

// Endpoint temporal de diagnóstico — solo SuperAdmin, solo para comprobar
// si el correo de invitación de Microsoft/Teams se envía de verdad en
// producción. Se borra en cuanto se resuelva el problema reportado.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const info = await sendInvitacionMicrosoftEmail(session.user.email, "Prueba Diagnóstico");
    return NextResponse.json({
      ok: true,
      messageId: (info as any)?.messageId ?? null,
      accepted: (info as any)?.accepted ?? null,
      rejected: (info as any)?.rejected ?? null,
      response: (info as any)?.response ?? null,
      envelope: (info as any)?.envelope ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        errorMessage: e?.message ?? String(e),
        errorCode: e?.code ?? null,
        errorResponseCode: e?.responseCode ?? null,
        errorCommand: e?.command ?? null,
      },
      { status: 500 }
    );
  }
}
