import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { query } from '../db/connection.js';
import { badRequest } from '../utils/http.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const funnelPath = path.resolve(__dirname, '../funnels/concurso.json');

function loadFunnel() {
  return JSON.parse(fs.readFileSync(funnelPath, 'utf-8'));
}

function createToken() {
  return crypto.randomBytes(12).toString('hex');
}

function normalizeText(text = '') {
  return String(text).trim();
}

function normalizeAnswer(text, step) {
  const value = normalizeText(text);
  const numericOption = Number(value);

  if (Number.isInteger(numericOption) && numericOption >= 1 && numericOption <= step.options.length) {
    return step.options[numericOption - 1];
  }

  const lower = value.toLowerCase();
  const matched = step.options.find((option) => option.toLowerCase() === lower);
  return matched || value;
}

function buildQuestionMessage(funnel, step) {
  if (step.id === funnel.steps[0].id) {
    return `${funnel.intro}\n\n${step.question}`;
  }

  return step.question;
}

function buildCheckoutUrl(session) {
  const baseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/c/concurso/${session.lead_token}`;
}

function buildFinalOffer(funnel, answers, session) {
  const answerMap = Object.fromEntries(answers.map((answer) => [answer.step_id, answer.normalized_answer || answer.answer]));
  const dificuldade = answerMap.dificuldade || 'Informática para concursos';
  const banca = answerMap.banca || 'sua banca';
  const urgencia = answerMap.urgencia || 'sua prova';
  const checkoutUrl = buildCheckoutUrl(session);

  const bullets = funnel.offerBullets.map((item) => `• ${item}`).join('\n');

  return [
    `Pelo que você respondeu, seu maior risco é estudar Informática como teoria e não como a banca cobra.`,
    `\nSeu ponto de atenção agora: ${dificuldade}.`,
    `\nPara ${banca}, isso precisa ser revisado com foco em pegadinhas, exemplos e questões comentadas — principalmente considerando: ${urgencia}.`,
    `\nPor isso, o melhor caminho é acessar a ${funnel.productName}.`,
    `\nEla reúne:\n${bullets}`,
    `\nAcesso imediato, pagamento único e revisão direta ao ponto.`,
    `\nAqui está seu acesso:\n${checkoutUrl}`
  ].join('\n');
}

export async function startFunnel({ instagramUserId, username, keyword, source = 'manual' }) {
  if (!instagramUserId) {
    throw badRequest('instagramUserId é obrigatório.');
  }

  const funnel = loadFunnel();
  const normalizedKeyword = normalizeText(keyword || funnel.keyword).toUpperCase();

  if (normalizedKeyword !== funnel.keyword) {
    throw badRequest(`Palavra-chave inválida. Use ${funnel.keyword}.`, 'invalid_keyword');
  }

  const leadResult = await query(
    `insert into leads (instagram_user_id, username, first_source)
     values ($1, $2, $3)
     on conflict (instagram_user_id) do update
       set username = excluded.username,
           updated_at = now()
     returning *`,
    [instagramUserId, username || null, source]
  );

  const lead = leadResult.rows[0];

  await query(
    `update funnel_sessions
     set status = 'superseded', updated_at = now()
     where lead_id = $1 and funnel_key = $2 and status = 'active'`,
    [lead.id, funnel.key]
  );

  const firstStep = funnel.steps[0];
  const sessionResult = await query(
    `insert into funnel_sessions (lead_id, funnel_key, current_step_id, lead_token, metadata)
     values ($1, $2, $3, $4, $5)
     returning *`,
    [lead.id, funnel.key, firstStep.id, createToken(), { keyword: normalizedKeyword, source }]
  );

  const session = sessionResult.rows[0];

  await query(
    `insert into funnel_events (session_id, lead_id, event_type, payload)
     values ($1, $2, $3, $4)`,
    [session.id, lead.id, 'funnel_started', { source, keyword: normalizedKeyword }]
  );

  return {
    lead,
    session,
    message: buildQuestionMessage(funnel, firstStep),
    step: firstStep
  };
}

export async function handleLeadMessage({ instagramUserId, username, text }) {
  if (!instagramUserId) {
    throw badRequest('instagramUserId é obrigatório.');
  }

  if (!text) {
    throw badRequest('text é obrigatório.');
  }

  const funnel = loadFunnel();

  const leadResult = await query(
    `select * from leads where instagram_user_id = $1`,
    [instagramUserId]
  );

  if (leadResult.rowCount === 0) {
    return startFunnel({ instagramUserId, username, keyword: funnel.keyword, source: 'message_without_session' });
  }

  const lead = leadResult.rows[0];

  const sessionResult = await query(
    `select * from funnel_sessions
     where lead_id = $1 and funnel_key = $2 and status = 'active'
     order by created_at desc
     limit 1`,
    [lead.id, funnel.key]
  );

  if (sessionResult.rowCount === 0) {
    return startFunnel({ instagramUserId, username, keyword: funnel.keyword, source: 'message_without_active_session' });
  }

  const session = sessionResult.rows[0];
  const currentStepIndex = funnel.steps.findIndex((step) => step.id === session.current_step_id);

  if (currentStepIndex === -1) {
    throw badRequest('Sessão com etapa inválida.', 'invalid_session_step');
  }

  const currentStep = funnel.steps[currentStepIndex];
  const normalizedAnswer = normalizeAnswer(text, currentStep);

  await query(
    `insert into funnel_answers (session_id, step_id, question, answer, normalized_answer)
     values ($1, $2, $3, $4, $5)`,
    [session.id, currentStep.id, currentStep.question, normalizeText(text), normalizedAnswer]
  );

  await query(
    `insert into funnel_events (session_id, lead_id, event_type, payload)
     values ($1, $2, $3, $4)`,
    [session.id, lead.id, 'answer_received', { stepId: currentStep.id, answer: normalizeText(text), normalizedAnswer }]
  );

  const nextStep = funnel.steps[currentStepIndex + 1];

  if (nextStep) {
    await query(
      `update funnel_sessions
       set current_step_id = $1, updated_at = now()
       where id = $2`,
      [nextStep.id, session.id]
    );

    return {
      lead,
      session: { ...session, current_step_id: nextStep.id },
      message: buildQuestionMessage(funnel, nextStep),
      step: nextStep
    };
  }

  await query(
    `update funnel_sessions
     set status = 'checkout_sent', current_step_id = null, updated_at = now()
     where id = $1`,
    [session.id]
  );

  const answersResult = await query(
    `select * from funnel_answers
     where session_id = $1
     order by created_at asc`,
    [session.id]
  );

  const finalSession = { ...session, status: 'checkout_sent', current_step_id: null };
  const message = buildFinalOffer(funnel, answersResult.rows, finalSession);

  await query(
    `insert into funnel_events (session_id, lead_id, event_type, payload)
     values ($1, $2, $3, $4)`,
    [session.id, lead.id, 'checkout_sent', { checkoutUrl: buildCheckoutUrl(finalSession) }]
  );

  return {
    lead,
    session: finalSession,
    message,
    step: null,
    checkoutUrl: buildCheckoutUrl(finalSession)
  };
}
