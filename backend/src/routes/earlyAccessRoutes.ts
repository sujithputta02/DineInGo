import { Router } from 'express';
import { joinEarlyAccess, listEarlyAccess } from '../controllers/earlyAccessController';

const router = Router();

router.post('/join', joinEarlyAccess);
router.get('/list', listEarlyAccess); // View all leads split by type

export default router;
