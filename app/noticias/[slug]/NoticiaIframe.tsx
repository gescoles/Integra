"use client";

import { useRef, useState } from "react";

// Renderiza el HTML/CSS personalizado que ha subido el SuperAdmin dentro de
// un <iframe> aislado del resto de la web: aunque el HTML traiga estilos
// globales agresivos (body { margin: 0 }, etc.) no puede afectar al resto
// de la página. Por seguridad no se permite ejecutar <script> (sandbox sin
// allow-scripts) — solo maquetación con HTML y CSS.
export function NoticiaIframe({ html, css }: { html: string; css: string | null }) {
  const [altura, setAltura] = useState(400);
  const ref = useRef<HTMLIFrameElement>(null);

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; font-family: system-ui, sans-serif; }
  ${css ?? ""}
</style>
</head>
<body>
${html}
</body>
</html>`;

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="Contenido de la noticia"
      className="w-full rounded-2xl border border-slate-200"
      style={{ height: altura }}
      onLoad={() => {
        const doc = ref.current?.contentWindow?.document;
        if (doc) setAltura(Math.max(doc.documentElement.scrollHeight, 200));
      }}
    />
  );
}
