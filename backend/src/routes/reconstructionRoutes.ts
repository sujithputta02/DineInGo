import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { reconstructionService } from '../services/reconstructionService';
import { verifyUserToken } from '../middleware/userAuth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * GET /api/v1/reconstruction/providers
 * Returns public reconstruction capabilities without exposing internal keys
 */
router.get('/providers', (req: Request, res: Response) => {
  try {
    const rawCapabilities = reconstructionService.getProviderCapabilities();
    // Sanitize: do not leak environment variable names or internal configuration
    const providers = rawCapabilities.map(p => ({
      id: p.id,
      name: p.name,
      configured: p.configured,
      description: p.description,
      latencySecondsEstimate: p.latencySecondsEstimate,
      mobileARCompliant: p.mobileARCompliant
    }));

    res.json({
      success: true,
      providers,
      activeProvider: reconstructionService.getActiveProvider().id
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve providers' });
  }
});

/**
 * POST /api/v1/reconstruction/jobs
 * Initiates an image-to-3D food reconstruction job
 * Requires authenticated user. User identity taken strictly from token context.
 */
router.post('/jobs', verifyUserToken, apiLimiter, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    const { dishName, imageUrl, referencePlateDiameterMeters, metadata } = req.body;

    if (!dishName || typeof dishName !== 'string' || dishName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dishName: must be a non-empty string.'
      });
    }

    if (referencePlateDiameterMeters !== undefined) {
      const diam = Number(referencePlateDiameterMeters);
      if (isNaN(diam) || diam < 0.05 || diam > 1.5) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referencePlateDiameterMeters: must be between 0.05m and 1.5m.'
        });
      }
    }

    // Submit job strictly using verified authUser.uid
    const job = await reconstructionService.submitJob({
      userId: authUser.uid,
      dishName: dishName.trim(),
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      referencePlateDiameterMeters: Number(referencePlateDiameterMeters) || 0.24,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : undefined
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
      message: 'Internal server error queuing reconstruction job'
    });
  }
});

/**
 * GET /api/v1/reconstruction/jobs/:jobId
 * Polls status and retrieval for a reconstruction job
 * Requires authenticated user and verifies job ownership
 */
router.get('/jobs/:jobId', verifyUserToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    const { jobId } = req.params;
    const job = await reconstructionService.getJob(jobId);

    // Non-disclosing 404 for unowned or missing jobs
    if (!job || job.userId !== authUser.uid) {
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

/**
 * GET /api/v1/reconstruction/assets/:filename
 * Serves generated 3D GLB assets with security checks
 */
router.get('/assets/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!/^[a-zA-Z0-9_\-]+\.glb$/.test(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid asset filename' });
    }

    const filePath = path.join(process.cwd(), 'storage', 'reconstructions', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '3D model asset not found' });
    }

    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error serving reconstructed asset:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve asset' });
  }
});

export default router;
