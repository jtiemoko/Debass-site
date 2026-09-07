// api/submit-lead.js
// Proxy serveur pour la création de leads Vtiger CRM.
// Les publicid Vtiger ne quittent jamais le serveur (variables d'environnement).
// Protections : honeypot anti-bot, validation des champs, limitation de débit par IP.
// Appelée depuis n'importe quel domaine Debass (site principal + domaine LIANA ERP) via CORS.
//
// Deux webforms Vtiger distincts, chacun avec son propre publicid :
//   - "general" : Contact / Chatbot / Livre blanc  -> VTIGER_PUBLIC_ID
//   - "liana"   : Devis LIANA ERP (champs dédiés)   -> VTIGER_PUBLIC_ID_LIANA

const ALLOWED_ORIGINS = [
  'https://debasstechnologies.com',
  'https://www.debasstechnologies.com',
  'https://lianaerp.soft',        // domaine LIANA ERP — à ajuster au domaine final choisi
  'https://www.lianaerp.soft',
];

const VTIGER_URL = 'https://debasstechnologies.od2.vtiger.com/modules/Webforms/capture.php';

// Limitation de débit en mémoire (par processus). Se réinitialise à chaque déploiement —
// suffisant contre un abus ponctuel, pas contre une attaque distribuée soutenue.
const RATE_LIMIT = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 5;                     // 5 soumissions / 10 min / IP

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin') || '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request) {
  const origin = request.headers.get('origin') || '';

  let data;
  try {
    data = await request.json();
  } catch {
    return json(400, { ok: false, why: 'invalid_body' }, origin);
  }

  // Honeypot : champ caché "website" — un humain le laisse vide, un bot le remplit.
  // On répond un faux succès pour ne pas signaler au bot qu'il a été détecté.
  if (data.website) {
    return json(200, { ok: true }, origin);
  }

  // Validation minimale des champs
  const nom = (data.nom || '').trim();
  const email = (data.email || '').trim();
  if (!nom || !EMAIL_RE.test(email)) {
    return json(400, { ok: false, why: 'invalid_fields' }, origin);
  }

  // Limitation de débit par IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const recent = (RATE_LIMIT.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    return json(429, { ok: false, why: 'rate_limited' }, origin);
  }
  recent.push(now);
  RATE_LIMIT.set(ip, recent);

  // Sélection du webform Vtiger : "liana" (devis LIANA ERP) ou "general" (tout le reste)
  const formType = data.form === 'liana' ? 'liana' : 'general';
  const publicId = formType === 'liana'
    ? process.env.VTIGER_PUBLIC_ID_LIANA
    : process.env.VTIGER_PUBLIC_ID;

  if (!publicId) {
    console.error(`Variable d'environnement manquante pour le formulaire "${formType}" (VTIGER_PUBLIC_ID${formType === 'liana' ? '_LIANA' : ''}).`);
    return json(500, { ok: false, why: 'server_misconfigured' }, origin);
  }

  const nameParts = nom.split(' ');
  const fields = {
    publicid: publicId,
    urlencodeenable: '1',
    leadsource: data.leadsource || 'Site web',
    firstname: nameParts[0] || nom,
    lastname: nameParts.slice(1).join(' ') || '-',
    email,
    mobile: data.telephone || '',
    description: data.message || '',
  };

  if (formType === 'liana') {
    // Champs propres au webform "LIANA ERP Custom Quote"
    fields.cf_leads_companyname = data.entreprise || '';
    fields.cf_leads_administratorlicense = data.adminLicense || '';
    fields.cf_leads_licensemanager = data.managerLicense || '';
    fields.cf_leads_userlicense = data.userLicense || '';
    fields.cf_leads_desiredformula = data.desiredFormula || '';
    fields.cf_leads_preferredaccommodation = data.preferredAccommodation || '';
  } else {
    // Champs du webform général "Contact Our Experts"
    fields.company = data.entreprise || '';
  }

  const vtigerBody = new URLSearchParams(fields);
  // Champ multi-valeurs (modules souhaités) : ajouté séparément, une entrée par valeur
  if (formType === 'liana' && Array.isArray(data.desiredModules)) {
    data.desiredModules.forEach((m) => vtigerBody.append('cf_leads_desiredbasicmodules[]', m));
  }

  try {
    const vtigerRes = await fetch(VTIGER_URL, {
      method: 'POST',
      body: vtigerBody,
    });
    if (!vtigerRes.ok) throw new Error('vtiger_http_' + vtigerRes.status);
    return json(200, { ok: true }, origin);
  } catch (err) {
    console.error('Erreur envoi Vtiger :', err);
    return json(502, { ok: false, why: 'vtiger_unreachable' }, origin);
  }
}
