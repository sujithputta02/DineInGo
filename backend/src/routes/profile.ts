import express, { Request, Response } from 'express';
import Profile from '../models/Profile';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { getIO } from '../utils/socket';

const router = express.Router();

// Multer setup for avatar uploads
const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.uid}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Avatar upload endpoint
router.post('/:uid/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    // Add avatar to avatars array and set as currentAvatar
    const profile = await Profile.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $push: { avatars: avatarUrl },
        $set: { currentAvatar: avatarUrl, updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );
    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', { uid: req.params.uid, profile });
    res.json({ avatarUrl, profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Set current avatar endpoint
router.post('/:uid/set-avatar', async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: { currentAvatar: avatarUrl, updatedAt: new Date() } },
      { new: true }
    );
    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', { uid: req.params.uid, profile });
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set current avatar' });
  }
});

// Get profile by UID
router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const profile = await Profile.findOne({ uid: req.params.uid });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Upsert (create or update) profile by UID
router.post('/:uid', async (req: Request, res: Response) => {
  try {
    const update = { ...req.body, updatedAt: new Date() };
    const profile = await Profile.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: update },
      { new: true, upsert: true }
    );
    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', { uid: req.params.uid, profile });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

export default router; 