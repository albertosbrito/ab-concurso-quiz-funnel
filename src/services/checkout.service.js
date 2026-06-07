import crypto from 'node:crypto';
import { query } from '../db/connection.js';

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex');
}

export async function registerCheckoutClick({ leadToken, productKey, userAgent, ip }) {
  const checkoutUrl = process.env.CHECKOUT_CONCURSO_URL;

  if (!checkoutUrl) {
    const error = new Error('CHECKOUT_CONCURSO_URL não configurado.');
    error.statusCode = 500;
    error.code = 'checkout_not_configured';
    error.publicMessage = 'Checkout não configurado.';
    throw error;
  }

  const sessionResult = await query(
    `select fs.*, l.id as lead_id
     from funnel_sessions fs
     join leads l on l.id = fs.lead_id
     where fs.lead_token = $1
     limit 1`,
    [leadToken]
  );

  const session = sessionResult.rows[0] || null;

  await query(
    `insert into checkout_clicks (session_id, lead_id, product_key, checkout_url, user_agent, ip_hash)
     values ($1, $2, $3, $4, $5, $6)`,
    [session?.id || null, session?.lead_id || null, productKey, checkoutUrl, userAgent || null, hashIp(ip)]
  );

  if (session) {
    await query(
      `insert into funnel_events (session_id, lead_id, event_type, payload)
       values ($1, $2, $3, $4)`,
      [session.id, session.lead_id, 'checkout_clicked', { productKey, checkoutUrl }]
    );
  }

  return checkoutUrl;
}
