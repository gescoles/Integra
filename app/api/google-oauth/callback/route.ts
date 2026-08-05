import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") {
    return new NextResponse("Solo el SuperAdmin puede configurar esto.", { status: 403 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return new NextResponse(`Google ha devuelto un error: ${errorParam}`, { status: 400 });
  }
  if (!code) {
    return new NextResponse("Falta el código de autorización de Google.", { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const redirectUri = new URL("/api/google-oauth/callback", req.url).toString();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return new NextResponse(
      "Google no ha devuelto un 'refresh_token' (suele pasar si ya habías autorizado esta app antes). " +
        "Entra en https://myaccount.google.com/permissions, quítale el acceso a esta app, y vuelve a visitar /api/google-oauth/start.",
      { status: 400 }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; padding: 40px; max-width: 640px; margin: 0 auto;">
    <h2>✅ Copia este valor:</h2>
    <p>Pégalo en tu <code>.env</code> local y en las variables de entorno de Vercel, en <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>.</p>
    <textarea style="width:100%; height:100px; font-family: monospace; padding: 10px;" readonly onclick="this.select()">${tokens.refresh_token}</textarea>
    <p style="color: #666;">Cuando lo tengas guardado, ya puedes cerrar esta pestaña. No hace falta volver a hacer esto salvo que revoques el acceso.</p>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
