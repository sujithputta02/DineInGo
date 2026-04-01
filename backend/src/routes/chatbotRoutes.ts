import express, { Request, Response } from 'express';
import { chatbotService } from '../services/chatbotService';
import { promptInjectionGuard } from '../middleware/aiThreatGuard';
import { strictAiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Send a message to the chatbot — guarded by prompt injection detector and strict rate limit
router.post('/message', strictAiLimiter, promptInjectionGuard, async (req: Request, res: Response) => {
  try {
    const { userId, message, userContext, language } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and message are required'
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid message',
        message: 'Message must be a non-empty string'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: 'Message too long',
        message: 'Message must be less than 1000 characters'
      });
    }

    console.log(`Chatbot message from user ${userId} (lang: ${language || 'en'}): ${message.substring(0, 50)}...`);

    const response = await chatbotService.sendMessage(userId, message, userContext, language);

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Chatbot route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process chatbot message'
    });
  }
});

// Get chat history
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
        message: 'userId is required'
      });
    }

    const history = chatbotService.getChatHistory(userId);

    res.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chat history'
    });
  }
});

// Clear chat session
router.delete('/session/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
        message: 'userId is required'
      });
    }

    chatbotService.clearSession(userId);

    res.json({
      success: true,
      message: 'Chat session cleared successfully'
    });

  } catch (error: any) {
    console.error('Clear session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear chat session'
    });
  }
});

// Get session stats
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
        message: 'userId is required'
      });
    }

    const stats = chatbotService.getSessionStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session stats'
    });
  }
});

export default router;
