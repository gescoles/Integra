# Docentium — Landing page

Proyecto Next.js 14 + TypeScript + Tailwind CSS con la landing page de Docentium.

## Cómo arrancarlo en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Estructura

- `app/page.tsx` — la landing page completa (hero, features, planes, footer, etc.)
- `app/layout.tsx` — layout raíz (metadata del sitio)
- `app/globals.css` — estilos globales y directivas de Tailwind
- `tailwind.config.ts` — configuración de Tailwind (colores `navy` y `brand`)

## Siguiente paso

Cuando estés contento con el resultado visual, sube el proyecto entero a GitHub y conéctalo a Vercel para desplegarlo. El login y la base de datos (Supabase/Prisma) se añaden en una fase posterior.
