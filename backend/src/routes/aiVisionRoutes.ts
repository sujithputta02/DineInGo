import express, { Request, Response } from 'express';
import { verifyUserToken } from '../middleware/userAuth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

const OPENROUTER_VISION_MODELS = [
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen2.5-vl-7b-instruct:free'
];

function cleanAILabel(rawText: string | null | undefined): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '');
  cleaned = cleaned.replace(/^(this is|it is|this dish is|the dish is|food:|dish:)\s*/i, '');
  cleaned = cleaned.replace(/\.$/, '');
  const firstLine = cleaned.split('\n')[0].trim();
  return firstLine.substring(0, 80).trim();
}

/**
 * POST /api/v1/vision/identify
 * Identifies dish from image base64 using server-only AI credentials
 */
router.post('/identify', verifyUserToken, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { image, ocrText } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid image base64 data URL or string is required.'
      });
    }

    // Limit payload size to ~10MB
    if (image.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: 'Image payload exceeds 10MB limit.'
      });
    }

    const cleanBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const sarvamKey = process.env.SARVAM_API_KEY;

    // 1. Tier 1: If OCR text provided and Sarvam AI is configured
    if (ocrText && sarvamKey && sarvamKey.trim() !== '' && sarvamKey !== 'your-sarvam-api-key') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const sarvamRes = await fetch('https://api.sarvam.ai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': sarvamKey
          },
          body: JSON.stringify({
            model: 'sarvam-2b',
            messages: [
              {
                role: 'system',
                content: 'You are an Indian menu OCR entity extractor. Given messy text from a menu, return ONLY the single most prominent dish name. Nothing else.'
              },
              {
                role: 'user',
                content: ocrText
              }
            ],
            max_tokens: 30,
            temperature: 0.1
          })
        });

        clearTimeout(timeout);

        if (sarvamRes.ok) {
          const sData = await sarvamRes.json();
          const label = cleanAILabel(sData?.choices?.[0]?.message?.content);
          if (label && label.length > 2) {
            return res.json({
              success: true,
              label,
              confidence: 0.94,
              tier: 'sarvam-ocr',
              provider: 'Sarvam AI OCR Pipeline'
            });
          }
        }
      } catch (err: any) {
        console.warn('[Backend Vision] Sarvam OCR step failed:', err.message);
      }
    }

    // 2. Tier 2: OpenRouter Multimodal Vision
    if (openRouterKey && openRouterKey.trim() !== '' && openRouterKey !== 'your-openrouter-api-key') {
      for (const model of OPENROUTER_VISION_MODELS) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openRouterKey}`,
              'HTTP-Referer': process.env.FRONTEND_URL || 'https://dineingo.com',
              'X-Title': 'DineInGo AI Food Vision'
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
                    },
                    {
                      type: 'text',
                      text: 'What food dish is shown in this image? Reply with ONLY the concise dish name (e.g. "Caesar Salad" or "Butter Chicken"). If not food, reply with "NOT_FOOD". If unsure, give the closest generic dish category.'
                    }
                  ]
                }
              ],
              max_tokens: 30,
              temperature: 0.1
            })
          });

          clearTimeout(timeout);

          if (response.ok) {
            const data = await response.json();
            const label = cleanAILabel(data?.choices?.[0]?.message?.content);

            if (label && label !== 'NOT_FOOD' && !label.toLowerCase().includes('sorry') && !label.toLowerCase().includes('cannot')) {
              return res.json({
                success: true,
                label,
                confidence: 0.91,
                tier: 'openrouter',
                provider: `OpenRouter (${model})`
              });
            }
          }
        } catch (err: any) {
          console.warn(`[Backend Vision] ${model} attempt failed:`, err.message);
        }
      }
    }

    // If no external keys configured or all external requests failed:
    // Report truthfully that external inference is not configured.
    return res.json({
      success: false,
      code: 'NO_INFERENCE_RESULT',
      message: 'No cloud vision provider identified the image. Local edge ML or manual dish confirmation required.'
    });

  } catch (error: any) {
    console.error('[Backend Vision] Critical error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error processing food image.'
    });
  }
});

export default router;
