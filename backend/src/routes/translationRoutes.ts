import express from 'express';
import { TranslationService } from '../services/translationService';

const router = express.Router();

/**
 * GET /api/translations/:lang
 * Returns all translations for a specific language
 */
router.get('/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const translations = await TranslationService.getAllTranslations(lang);
    res.json(translations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

/**
 * POST /api/translations/translate
 * Translates a key on-the-fly and returns it
 */
router.post('/translate', async (req, res) => {
  try {
    const { key, language, englishValue } = req.body;
    if (!key || !language || !englishValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const translatedValue = await TranslationService.getTranslation(key, language, englishValue);
    res.json({ value: translatedValue });
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

/**
 * POST /api/translations/seed
 * Admin only: Seeds translations into DB
 */
router.post('/seed', async (req, res) => {
  try {
    const { translations } = req.body;
    await TranslationService.seedTranslations(translations);
    res.json({ message: 'Translations seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Seeding failed' });
  }
});

/**
 * PUT /api/translations/update
 * Admin only: Updates a single translation
 */
router.put('/update', async (req, res) => {
  try {
    const { key, language, value } = req.body;
    if (!key || !language || !value) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const updated = await TranslationService.updateTranslation(key, language, value);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
