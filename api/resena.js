// Formulario de reseñas: valida la reseña y te la envía por correo para que la apruebes.
// Nada se publica solo: para publicarla, se agrega a data/resenas.json.
// Usa las mismas variables de entorno que api/contacto.js (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM).

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
  const v = (k, max) => String(b[k] || '').trim().replace(/\s+/g, ' ').slice(0, max);
  const name = v('name', 80), brand = v('brand', 80), role = v('role', 80), email = v('email', 191);
  const text = String(b.text || '').trim().slice(0, 700);
  const rating = Math.min(5, Math.max(1, parseInt(b.rating, 10) || 5));

  if (v('website', 200)) return res.status(200).json({ ok: true }); // trampa anti-spam

  const errors = {};
  if (!name) errors.name = ['Escribe tu nombre.'];
  if (!brand) errors.brand = ['Escribe el nombre de tu marca o empresa.'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ['Escribe un correo válido (no se publica).'];
  if (text.length < 20) errors.text = ['Cuéntame un poco más (mínimo 20 caracteres).'];
  if (/https?:\/\/|www\./i.test(text)) errors.text = ['Por favor no incluyas enlaces en la reseña.'];
  if (!b.consent) errors.consent = ['Debes autorizar la publicación de la reseña.'];
  if (Object.keys(errors).length) return res.status(422).json({ ok: false, errors });

  if (!process.env.RESEND_API_KEY) { console.error('Falta RESEND_API_KEY'); return res.status(500).json({ ok: false }); }

  const fecha = new Date().toISOString().slice(0, 10);
  const bloque = JSON.stringify({ nombre: name, marca: brand, cargo: role, estrellas: rating, texto: text, fecha }, null, 2);
  const html = `
    <h2>Nueva reseña para aprobar</h2>
    <p style="font-size:22px;color:#b08d57">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
    <blockquote style="font-size:17px;font-style:italic;border-left:3px solid #7a1f2b;padding-left:12px">${esc(text).replace(/\n/g, '<br>')}</blockquote>
    <p><b>${esc(name)}</b>${role ? ' · ' + esc(role) : ''} — ${esc(brand)}<br><small>Correo (privado): ${esc(email)}</small></p>
    <p>Para publicarla, pídele a Claude: <i>"publica esta reseña"</i> y pega este bloque:</p>
    <pre style="background:#f6efe3;padding:12px;border-radius:6px">${esc(bloque)}</pre>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TO], reply_to: email, subject: `Nueva reseña para aprobar: ${name} (${brand})`, html }),
    });
    if (!r.ok) { console.error('Resend', r.status, await r.text()); return res.status(502).json({ ok: false }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false });
  }
}
