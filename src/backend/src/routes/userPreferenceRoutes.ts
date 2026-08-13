import { Router } from 'express';
import * as userPreferenceController from '../controllers/userPreferenceController';

const router = Router();

router.get('/:userId', userPreferenceController.getUserPreference);
router.post('/', userPreferenceController.upsertUserPreference);
router.post('/score', userPreferenceController.updateCuisineScore);

export default router;
