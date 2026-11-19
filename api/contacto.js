// Formulario "Trabajemos juntos": valida los datos y te los envía por correo con Resend.
// Variables de entorno en Vercel (Settings → Environment Variables):
//   RESEND_API_KEY  (obligatoria) clave de https://resend.com
//   CONTACT_TO      (opcional) correo que recibe los mensajes; por defecto buitragogiselle7@gmail.com
//   CONTACT_FROM    (opcional) remitente; por defecto "Portafolio <onboarding@resend.dev>"

const TO = process.env.CONTACT_TO || 'buitragogiselle7@gmail.com';
const FROM = process.env.CONTACT_FROM || 'Portafolio <onboarding@resend.dev>';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) { for await (const chunk of req) raw += chunk; }
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch { return {}; } }
  return Object.fromEntries(new URLSearchParams(raw));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const b = await readBody(req);
  const v = (k, max) => String(b[k] || '').trim().slice(0, max);
  const name = v('name', 120), email = v('email', 191), phone = v('phone', 40), message = v('message', 3000), source = v('source', 80);

  // Campo trampa anti-spam: si viene lleno, fingimos éxito y no enviamos nada.
  if (v('website', 200)) return res.status(200).json({ ok: true });

  const errors = {};
  if (!name) errors.name = ['Escribe tu nombre.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ['Escribe un correo válido.'];
  if (message.length < 10) errors.message = ['Cuéntame un poco más (mínimo 10 caracteres).'];
  if (!b.consent) errors.consent = ['Debes aceptar la política de privacidad.'];
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  if (!process.env.RESEND_API_KEY) {
    console.error('Falta RESEND_API_KEY');
    return res.status(500).json({ ok: false });
  }

  const html = `
    <h2>Nuevo mensaje desde tu portafolio</h2>
    <p><b>Nombre:</b> ${esc(name)}</p>
    <p><b>Correo:</b> ${esc(email)}</p>
    <p><b>Teléfono / WhatsApp:</b> ${esc(phone || '—')}</p>
    <p><b>Mensaje:</b><br>${esc(message).replace(/\n/g, '<br>')}</p>
    <p style="color:#888"><small>Origen: ${esc(source || 'directo')} · Aceptó la política de privacidad: ${new Date().toISOString()}</small></p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject: `Nuevo contacto: ${name}`, html }),
    });
    if (!r.ok) { console.error('Resend', r.status, await r.text()); return res.status(502).json({ ok: false }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false });
  }
}
