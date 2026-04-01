import { Request, Response, NextFunction } from 'express';
import platformAuth from '../utils/firebaseAdmin';

/**
 * SECURITY: User Identity Guard
 * Verifies Firebase ID Tokens from the client
 * Attaches the decoded user data to req.user
 */
export const verifyUserToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Security credentials were not provided.' 
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Authentication token is missing.' 
      });
    }

    if (!platformAuth) {
      console.error('[IdentityGuard] Firebase Admin SDK NOT initialized.');
      return res.status(503).json({ 
        success: false, 
        message: 'Security Service Unavailable' 
      });
    }

    try {
      const decodedToken = await platformAuth.auth().verifyIdToken(token);
      
      // Attach the verified user identifying info to the request
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture
      };

      next();
    } catch (verifyError: any) {
      console.error('[IdentityGuard] Token verification failed:', verifyError.message);
      
      if (verifyError.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          success: false, 
          message: 'Session Expired: Please login again.' 
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Access token is invalid or forged.' 
      });
    }
  } catch (error) {
    console.error('[IdentityGuard] Critical error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Security authentication failed' 
    });
  }
};
