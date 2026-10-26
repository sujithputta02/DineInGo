import express, { Request, Response } from 'express';
import { reconstructionService } from '../services/reconstructionService';

const router = express.Router();

/**
 * GET /api/v1/reconstruction/providers
 * Returns available reconstruction providers and credential status
 */
router.get('/providers', (req: Request, res: Response) => {
  try {
    const providers = reconstructionService.getProviderCapabilities();
    res.json({
      success: true,
      providers,
      activeProvider: reconstructionService.getActiveProvider().id
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/reconstruction/jobs
 * Initiates an image-to-3D food reconstruction job
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const { userId, dishName, imageUrl, referencePlateDiameterMeters, metadata } = req.body;

    if (!userId || !dishName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userId and dishName are required.'
      });
    }

    const job = await reconstructionService.submitJob({
      userId,
      dishName,
      imageUrl,
      referencePlateDiameterMeters,
      metadata
    });

    res.status(202).json({
      success: true,
      message: '3D food reconstruction job queued',
      jobId: job.jobId,
      status: job.status,
      assetQuality: job.assetQuality,
      provider: job.provider
    });
  } catch (error: any) {
    console.error('Error creating 3D reconstruction job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error queuing reconstruction job'
    });
  }
});

/**
 * GET /api/v1/reconstruction/jobs/:jobId
 * Polls status and retrieval for a reconstruction job
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await reconstructionService.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Reconstruction job "${jobId}" was not found.`
      });
    }

    res.json({
      success: true,
      job: {
        jobId: job.jobId,
        dishName: job.dishName,
        status: job.status,
        progress: job.progress,
        provider: job.provider,
        assetQuality: job.assetQuality,
        modelUrl: job.modelUrl,
        dimensions: job.dimensions,
        contactPlaneAligned: job.contactPlaneAligned,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error fetching reconstruction job:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error retrieving reconstruction status'
    });
  }
});

export default router;
