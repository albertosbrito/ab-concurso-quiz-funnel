import { Router } from 'express';
import { registerCheckoutClick } from '../services/checkout.service.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/concurso/:leadToken', asyncHandler(async (req, res) => {
  const checkoutUrl = await registerCheckoutClick({
    leadToken: req.params.leadToken,
    productKey: 'concurso',
    userAgent: req.get('user-agent'),
    ip: req.ip
  });

  res.redirect(302, checkoutUrl);
}));

export default router;
