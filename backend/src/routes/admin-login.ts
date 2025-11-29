import express, { Request, Response } from 'express';

const router = express.Router();

// Secret 6-digit admin code from environment variable
const ADMIN_CODE = process.env.ADMIN_CODE || '492731'; // Default for development only

router.post('/', async (req: Request, res: Response) => {
  console.log('Admin login route hit', req.body);
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Admin code is required.' });
  }
  if (code !== ADMIN_CODE) {
    return res.status(401).json({ message: 'Invalid admin code.' });
  }
  // Optionally, set a session or return a token here
  res.json({ success: true, message: 'Admin login successful.' });
});

export default router; 