import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { reconstructionService } from '../services/reconstructionService';
import { getReconstructionStorageAdapter } from '../services/reconstructionStorageAdapter';
import { verifyUserToken } from '../middleware/userAuth';
import { apiLimiter } from '../middleware/rateLimiter';
import { RECONSTRUCTION_STORAGE_DIR } from '../config/storageConfig';
import { isValidAssetFilename, verifyAssetSignature, signAssetUrl } from '../utils/assetSecurity';
import { ReconstructionJob } from '../models/ReconstructionJob';
import platformAuth from '../utils/firebaseAdmin';

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
 * Helper to determine if a user has publisher permissions (restaurant owner or administrator).
 */
export function isAuthorizedPublisher(user: { uid: string; isAdmin?: boolean; role?: string } | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    user.isAdmin ||
    user.role === 'admin' ||
    user.role === 'restaurant_owner' ||
    user.role === 'owner' ||
    user.role === 'super_admin'
  );
}

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

    // Reject unauthorized attempts to create public assets
    if ((req.body.isPublic === true || req.body.isPublic === 'true') && !isAuthorizedPublisher(authUser)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only restaurant owners or administrators can publish public assets.'
      });
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
    // Newly generated user reconstructions are private by default.
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
 * PATCH /api/v1/reconstruction/jobs/:jobId/publish
 * Explicitly publishes a reconstructed 3D model to the public restaurant catalog.
 * Strictly restricted to restaurant owners and administrators.
 */
router.patch('/jobs/:jobId/publish', verifyUserToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || !authUser.uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Authentication required.' });
    }

    if (!isAuthorizedPublisher(authUser)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only restaurant owners or administrators can publish public assets.'
      });
    }

    const { jobId } = req.params;
    const publishedJob = await reconstructionService.publishJob(jobId, authUser.uid);

    if (!publishedJob) {
      return res.status(404).json({
        success: false,
        message: `Reconstruction job "${jobId}" was not found.`
      });
    }

    res.json({
      success: true,
      message: '3D model published to public catalog',
      job: {
        jobId: publishedJob.jobId,
        dishName: publishedJob.dishName,
        status: publishedJob.status,
        isPublic: publishedJob.isPublic,
        modelUrl: publishedJob.modelUrl,
        publishedAt: publishedJob.metadata?.publishedAt,
        publishedBy: publishedJob.metadata?.publishedBy
      }
    });
  } catch (error: any) {
    console.error('Error publishing reconstruction job:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error publishing reconstruction job'
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

    // Refresh signed URL for AR viewer if asset is private
    let modelUrl = job.modelUrl;
    if (modelUrl && !job.isPublic) {
      if (modelUrl.startsWith('/api/v1/reconstruction/assets/')) {
        const filenameMatch = modelUrl.match(/\/api\/v1\/reconstruction\/assets\/([^?]+)/);
        if (filenameMatch) {
          const filename = filenameMatch[1];
          const { signedQuery } = signAssetUrl(filename);
          modelUrl = `/api/v1/reconstruction/assets/${filename}?${signedQuery}`;
        }
      } else if (job.storageType === 'cloudinary' && job.storageKey) {
        const storageAdapter = getReconstructionStorageAdapter();
        if (typeof storageAdapter.getDeliveryUrl === 'function') {
          modelUrl = await storageAdapter.getDeliveryUrl(job.storageKey, false);
        }
      }
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
        modelUrl,
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
 * Extracts and verifies user token from Authorization header if present.
 */
async function extractUserFromAuthHeader(req: Request): Promise<{ uid: string; isAdmin?: boolean; role?: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || !platformAuth) {
    return null;
  }
  try {
    const decoded = await platformAuth.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      role: decoded.role || (decoded as any).role || 'user',
      isAdmin: decoded.isAdmin || (decoded as any).role === 'admin'
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/reconstruction/assets/:filename
 * Serves generated 3D GLB assets with strict authentication, ownership, and signed URL verification.
 * Private user-generated models are never made public without explicit publication or valid signed URLs.
 */
router.get('/assets/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    if (!isValidAssetFilename(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid asset filename' });
    }

    const { sig, exp } = req.query;

    // 1. Check for HMAC-signed URL query parameters (for mobile AR / model-viewer)
    if (sig || exp) {
      if (!sig || !exp || !verifyAssetSignature(filename, Number(exp), String(sig))) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Asset signature is invalid or expired.'
        });
      }

      // Valid cryptographic signature: retrieve asset buffer
      const filePath = path.join(RECONSTRUCTION_STORAGE_DIR, filename);
      let fileBuffer: Buffer | null = null;
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      } else {
        const storageAdapter = getReconstructionStorageAdapter();
        fileBuffer = await storageAdapter.getGLB(filename, false);
      }

      if (!fileBuffer) {
        return res.status(404).json({ success: false, message: '3D model asset not found' });
      }

      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(fileBuffer);
    }

    // 2. Query database for job ownership and publication status
    const job = await ReconstructionJob.findOne({
      $or: [
        { storageKey: filename },
        { storageKey: `dineingo/reconstructions/${filename}` },
        { modelUrl: new RegExp(filename) }
      ]
    });

    // 3. If asset has been deliberately published as public menu item
    if (job && job.isPublic) {
      const filePath = path.join(RECONSTRUCTION_STORAGE_DIR, filename);
      let fileBuffer: Buffer | null = null;
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      } else {
        const storageAdapter = getReconstructionStorageAdapter();
        fileBuffer = await storageAdapter.getGLB(filename, true);
      }

      if (!fileBuffer) {
        return res.status(404).json({ success: false, message: '3D model asset not found' });
      }

      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(fileBuffer);
    }

    // 4. Authenticated request check
    const authUser = await extractUserFromAuthHeader(req);
    if (authUser) {
      if (!job) {
        // If file exists but no job record is found, allow admins only
        if (authUser.isAdmin) {
          const filePath = path.join(RECONSTRUCTION_STORAGE_DIR, filename);
          const fileBuffer = fs.existsSync(filePath)
            ? fs.readFileSync(filePath)
            : await getReconstructionStorageAdapter().getGLB(filename, false);
          if (fileBuffer) {
            res.setHeader('Content-Type', 'model/gltf-binary');
            return res.send(fileBuffer);
          }
        }
        return res.status(404).json({ success: false, message: 'Asset metadata not found' });
      }

      if (job.userId === authUser.uid || authUser.isAdmin) {
        const filePath = path.join(RECONSTRUCTION_STORAGE_DIR, filename);
        let fileBuffer: Buffer | null = null;
        if (fs.existsSync(filePath)) {
          fileBuffer = fs.readFileSync(filePath);
        } else {
          const storageAdapter = getReconstructionStorageAdapter();
          fileBuffer = await storageAdapter.getGLB(filename, false);
        }

        if (!fileBuffer) {
          return res.status(404).json({ success: false, message: '3D model asset not found' });
        }

        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        return res.send(fileBuffer);
      } else {
        // Prevent cross-user access to private food models
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to access this private asset.'
        });
      }
    }

    // 5. Unauthenticated request to private asset
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Access to private 3D assets requires authentication or a valid signed asset URL.'
    });
  } catch (error: any) {
    console.error('Error serving reconstructed asset:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve asset' });
  }
});

export default router;
