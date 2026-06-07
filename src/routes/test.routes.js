import { Router } from 'express';
import { startFunnel, handleLeadMessage } from '../services/funnel.service.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

function buildHtml({ title, payload }) {
  const body = JSON.stringify(payload, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 920px; margin: 32px auto; padding: 0 16px; line-height: 1.45; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e5e7eb; padding: 16px; border-radius: 12px; }
    a { color: #0f766e; font-weight: 700; }
    .links { display: grid; gap: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="links">
    <a href="/test/start?user=teste123">Iniciar teste</a>
    <a href="/test/message?user=teste123&text=1">Responder 1</a>
    <a href="/test/message?user=teste123&text=FGV">Responder FGV</a>
    <a href="/test/message?user=teste123&text=7">Responder 7</a>
    <a href="/health">Health</a>
  </div>
  <pre>${body}</pre>
</body>
</html>`;
}

router.get('/start', asyncHandler(async (req, res) => {
  const user = String(req.query.user || 'teste123');
  const result = await startFunnel({
    instagramUserId: user,
    username: user,
    keyword: 'CONCURSO',
    source: 'browser_test'
  });

  res.type('html').send(buildHtml({
    title: 'Teste iniciado',
    payload: {
      message: result.message,
      step: result.step,
      session: {
        id: result.session.id,
        status: result.session.status,
        currentStepId: result.session.current_step_id,
        leadToken: result.session.lead_token
      }
    }
  }));
}));

router.get('/message', asyncHandler(async (req, res) => {
  const user = String(req.query.user || 'teste123');
  const text = String(req.query.text || '1');

  const result = await handleLeadMessage({
    instagramUserId: user,
    username: user,
    text
  });

  res.type('html').send(buildHtml({
    title: 'Resposta processada',
    payload: {
      sentText: text,
      message: result.message,
      step: result.step,
      checkoutUrl: result.checkoutUrl || null,
      session: {
        id: result.session.id,
        status: result.session.status,
        currentStepId: result.session.current_step_id,
        leadToken: result.session.lead_token
      }
    }
  }));
}));

export default router;
