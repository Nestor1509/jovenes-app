This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
---

## Configuración del proyecto (Ministerio de Jóvenes)

### 1) Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_SUPABASE_URL=TU_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
```

### 2) SQL (RLS y helpers)

Si ves errores como **"infinite recursion detected in policy for relation \"profiles\""** o banners de **"Sesión activa, pero no se pudo cargar tu perfil"**, ejecuta en Supabase (SQL Editor) los archivos:

- `supabase/sql/00_helpers.sql`
- `supabase/sql/01_policies_fix.sql`

> Estos scripts agregan funciones `SECURITY DEFINER` para evitar recursión en RLS, y dejan listo:
> - Admin puede ver perfiles y reportes
> - Líder puede ver reportes del grupo (solo jóvenes)
> - Reportes solo se pueden crear/editar **del día actual** (sin "ayer/mañana")

### 3) Rutas nuevas de detalle

- Líder: `/lider/joven/[id]`
- Admin: `/admin/persona/[id]`

En ambas puedes filtrar por rango y ver tendencia semanal + historial.
