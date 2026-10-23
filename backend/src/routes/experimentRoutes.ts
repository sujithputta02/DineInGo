import { Router } from 'express';
import { getActiveExperiments, trackExperimentEvent } from '../controllers/experimentController';

const router = Router();

// Public: Fetch active experiments configuration
router.get('/', getActiveExperiments);

// Public: Track an experiment exposure or conversion
router.post('/track', trackExperimentEvent);

export default router;
