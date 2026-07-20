# Los gastos de Doña Mónica

Aplicación web financiera, responsive y PWA para controlar ingresos, gastos familiares, pagos recurrentes, presupuestos, metas de ahorro y ventas de productos Ésika.

## Tecnologías

- Next.js con TypeScript y App Router.
- Tailwind CSS.
- Supabase para autenticación, Postgres y almacenamiento.
- Recharts para gráficos.
- PWA con manifest, service worker, pantalla offline y logo oficial.
- Exportación de reportes a PDF y CSV compatible con Excel.

## Variables de entorno

Cree `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SUPABASE_BUCKET=receipts
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No use la service role key en el frontend.

## Configurar Supabase

1. Cree un proyecto en [Supabase](https://supabase.com/).
2. Vaya a **Project Settings → API** y copie:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Abra **SQL Editor**.
4. Copie y ejecute el archivo `supabase/schema.sql`.
5. En **Authentication → Users**, cree el usuario de Mónica o active el flujo de invitación/correo que prefiera.
6. En **Authentication → URL Configuration**, agregue:
   - `http://localhost:3000` para local.
   - La URL de Vercel cuando despliegue.

El SQL crea tablas, índices, Row Level Security, políticas por usuario y el bucket `receipts`.

## Instalación local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Despliegue en Vercel

1. Suba el proyecto a GitHub.
2. Importe el repositorio en Vercel.
3. Configure estas variables en Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_BUCKET=receipts
NEXT_PUBLIC_APP_URL=https://su-dominio.vercel.app
```

4. Ejecute el build estándar:

```bash
npm run build
```

## Seguridad

- La app usa Supabase Auth.
- Todas las tablas tienen RLS activo.
- Cada usuario solo puede leer, crear, actualizar y borrar sus propios registros con `auth.uid() = userId`.
- Los archivos se suben dentro de una carpeta por usuario en Storage.
- El PIN rápido se guarda como hash local del dispositivo y no reemplaza la sesión segura de Supabase.

## Módulos incluidos

- Inicio de sesión y recuperación de contraseña.
- Dashboard con métricas, gráficos, frase diaria y consejos.
- Ingresos, gastos, historial, detalles, comprobantes y duplicado.
- Cuentas, transferencias, presupuestos, pagos recurrentes y calendario.
- Metas de ahorro.
- Productos, ventas, clientes y pagos pendientes de Ésika.
- Reportes PDF/CSV con logo oficial.
- Notificaciones internas, perfil, configuración, categorías, tema y tamaño de texto.
