import { Router } from 'express';
import { login, authRateLimit } from '../middleware/auth';

const router = Router();

// Login endpoint with rate limiting
router.post('/login', authRateLimit(5, 15 * 60 * 1000), login);

export default router;