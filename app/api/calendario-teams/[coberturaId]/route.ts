import { NextRequest, NextResponse } from "next/server";

// Al hacer clic en el botón del correo, esto redirige a Microsoft: allí
// el profesor inicia sesión (si no lo ha hecho ya) y le pide permiso
// explícito para escribir en su calendario — la primera vez. Usa la
// MISMA app de Azure que ya tenéis registrada para el login normal, así
// que no hace falta ninguna credencial nueva, solo que la URL de
// retorno de abajo esté también añadida en el Azure Portal.
//
// Esta misma ruta sirve tanto para una guardia directa como para una
// cobertura de ausencia — se distingue con "?tipo=guardia" o
// "?tipo=cobertura" en la URL (cobertura es el valor por defecto, para
// no romper los enlaces que ya se habían enviado antes de añadir esto).
export async function GET(req: NextRequest, { params }: { params: { coberturaId: string } }) {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;

  if (!tenantId || !clientId) {
    return new NextResponse(
      "Esta función todavía no está configurada (faltan las variables de Microsoft). Contacta con el administrador.",
      { status: 503 }
    );
  }

  const tipo = req.nextUrl.searchParams.get("tipo") === "guardia" ? "guardia" : "cobertura";
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendario-teams/callback`;

  const url = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email Calendars.ReadWrite");
  // El "state" es lo que nos permite saber, al volver de Microsoft, a
  // qué guardia (o cobertura) concreta corresponde este botón, y de qué
  // tipo es — van los dos datos juntos separados por ":".
  url.searchParams.set("state", `${tipo}:${params.coberturaId}`);
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url.toString());
}
