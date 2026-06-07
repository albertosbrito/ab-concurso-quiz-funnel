import { Router } from 'express';
import { startFunnel, handleLeadMessage } from '../services/funnel.service.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.post('/start', asyncHandler(async (req, res) => {
  const result = await startFunnel(req.body);

  res.status(201).json({
    ok: true,
    message: result.message,
    step: result.step,
    session: {
      id: result.session.id,
      status: result.session.status,
      currentStepId: result.session.current_step_id,
      leadToken: result.session.lead_token
    }
  });
}));

router.post('/message', asyncHandler(async (req, res) => {
  const result = await handleLeadMessage(req.body);

  res.json({
    ok: true,
    message: result.message,
    step: result.step,
    checkoutUrl: result.checkoutUrl || null,
    session: {
      id: result.session.id,
      status: result.session.status,
      currentStepId: result.session.current_step_id,
      leadToken: result.session.lead_token
    }
  });
}));

export default router;
