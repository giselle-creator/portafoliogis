# Portafolio — Giselle Buitrago Russi

Sitio estático listo para Vercel (sin compilación). Copia del portafolio que estaba en Hostinger.

## Estructura

```
index.html                 Página principal
politica-de-privacidad.html
assets/css, assets/js      Diseño y funciones (menú, filtros, reels, formulario, aviso de cookies)
assets/fonts               Tipografías (DM Serif Display, Caveat, Space Grotesk)
assets/images, cutouts,
decorations                Fotos, recortes, logos y decoraciones
data/reels.json            ← Lista de reels (edítala para agregar o quitar videos)
data/marcas.json           ← Lista de logos de marcas
media/reels/videos/        ← Aquí van los videos (.mp4)
api/contacto.js            Formulario "Trabajemos juntos" (envía correo con Resend)
vercel.json                Configuración de Vercel
```

## Agregar un reel

1. Sube el video a `media/reels/videos/` (ideal: .mp4, vertical, menos de 15 MB).
2. Sube la portada a `assets/images/` (.webp o .jpg, vertical).
3. Agrega un bloque en `data/reels.json`:

```json
{
  "categoria": "Vlog",
  "video": "/media/reels/videos/mi-video.mp4",
  "portada": "/assets/images/mi-portada.webp",
  "descripcion": "Vlog: un día conmigo"
}
```

Si `video` está vacío, el reel se muestra solo con la portada (sin botón ▶).
Los filtros de categoría se crean solos a partir de las categorías que uses.

## Agregar una marca

Sube el logo a `assets/images/` y agrega en `data/marcas.json`:

```json
{ "nombre": "Nombre de la marca", "logo": "/assets/images/logo-marca.webp" }
```

## Formulario de contacto

En Vercel → tu proyecto → Settings → Environment Variables:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | Clave de https://resend.com (obligatoria) |
| `CONTACT_TO` | Correo que recibe los mensajes (opcional, por defecto buitragogiselle7@gmail.com) |
| `CONTACT_FROM` | Remitente (opcional; por defecto `onboarding@resend.dev`) |

Con el remitente de prueba de Resend (`onboarding@resend.dev`), solo puedes recibir
correos en el mismo email con el que creaste la cuenta de Resend. Si quieres usar
otro remitente, verifica tu dominio en Resend.

Después de agregar las variables, vuelve a publicar (Deployments → Redeploy).

## Publicar

- **Con la terminal** (necesitas Node.js instalado), dentro de esta carpeta: `npx vercel link` (elige tu proyecto existente) y luego `npx vercel --prod`.
- **Con GitHub**: sube esta carpeta a un repositorio y conéctalo en Settings → Git; cada cambio se publica solo.
