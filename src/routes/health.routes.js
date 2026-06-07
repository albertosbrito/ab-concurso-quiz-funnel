import { Router } from 'express';
import { pool } from '../db/connection.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  let database = 'not_configured';

  if (process.env.DATABASE_URL) {
    try {
      await pool.query('select 1');
      database = 'ok';
    } catch (error) {
      database = 'error';
    }
  }

  res.json({
    ok: true,
    service: 'ab-concurso-quiz-funnel',
    status: 'online',
    database,
    timestamp: new Date().toISOString()
  });
}));

export default router;
