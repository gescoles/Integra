import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Ruta de configuración de un solo uso: la visitas UNA vez para autorizar a
// la app a escribir en tu Google Drive. Solo el SuperAdmin puede usarla.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") {
    return new NextResponse("Solo el SuperAdmin puede configurar esto.", { status: 403 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      "Faltan GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET en las variables de entorno.",
      { status: 500 }
    );
  }

  const redirectUri = new URL("/api/google-oauth/callback", req.url).toString();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // fuerza a que Google devuelva SIEMPRE un refresh_token
    scope: ["https://www.googleapis.com/auth/drive"],
  });

  return NextResponse.redirect(url);
}
