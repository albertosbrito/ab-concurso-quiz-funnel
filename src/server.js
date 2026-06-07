import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import healthRoutes from './routes/health.routes.js';
import funnelRoutes from './routes/funnel.routes.js';
import checkoutRoutes from './routes/checkout.routes.js';
import { errorHandler, notFoundHandler } from './utils/http.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRoutes);
app.use('/funnel', funnelRoutes);
app.use('/c', checkoutRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`AB Concurso Quiz Funnel running on port ${port}`);
});
