import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Endpoint de diagnostico TEMPORAL: compara (por hash, nunca en claro) las
// variables VAPID que ve el servidor desplegado contra las de un entorno
// local, para detectar un desajuste entre lo que hay en Vercel y lo que se
// probo en local. Se borra en cuanto se resuelva el problema de las
// notis push.
function hash(value: string | undefined): string {
  if (!value) return "EMPTY";
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  return NextResponse.json({
    VAPID_PUBLIC_KEY: hash(process.env.VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: hash(process.env.VAPID_PRIVATE_KEY),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: hash(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    VAPID_SUBJECT: hash(process.env.VAPID_SUBJECT),
    FIREBASE_PROJECT_ID_presente: Boolean(process.env.FIREBASE_PROJECT_ID),
  });
}
