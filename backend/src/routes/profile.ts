import express, { Request, Response } from 'express';
import { User } from '../models/User';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { getIO } from '../utils/socket';

const router = express.Router();

// Multer setup for avatar uploads
// Multer setup for avatar uploads (Memory Storage)
const storage: StorageEngine = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  }
});

// Avatar upload endpoint
router.post('/:uid/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // URL to serve the image
    const avatarUrl = `/api/profile/${req.params.uid}/avatar/image`;

    // Add avatar to avatars array and set as currentAvatar in User model
    // Store binary data in profilePicture field
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $push: { avatars: avatarUrl },
        $set: {
          currentAvatar: avatarUrl,
          photoURL: avatarUrl,
          updatedAt: new Date(),
          profilePicture: {
            data: file.buffer,
            contentType: file.mimetype
          }
        }
      },
      { new: true, upsert: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', {
      uid: req.params.uid,
      profile: {
        displayName: user.displayName,
        fullName: user.name,
        name: user.name,
        phoneNumber: user.phoneNumber,
        currentAvatar: user.currentAvatar,
        avatarUrl: user.photoURL,
        avatars: user.avatars || [],
        address: user.address
      }
    });

    res.json({
      avatarUrl,
      profile: {
        displayName: user.displayName,
        fullName: user.name,
        currentAvatar: user.currentAvatar,
        avatars: user.avatars || []
      }
    });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get avatar image endpoint
router.get('/:uid/avatar/image', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });

    if (!user || !user.profilePicture || !user.profilePicture.data) {
      // Redirect to default avatar or return 404
      // For now, let's just send a 404 so the frontend shows a placeholder
      return res.status(404).send('No profile picture found');
    }

    res.contentType(user.profilePicture.contentType);
    res.send(user.profilePicture.data);
  } catch (error) {
    console.error('Error serving avatar image:', error);
    res.status(500).send('Error serving image');
  }
});

// Set current avatar endpoint
router.post('/:uid/set-avatar', async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $set: {
          currentAvatar: avatarUrl,
          photoURL: avatarUrl,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', {
      uid: req.params.uid,
      profile: {
        displayName: user.displayName,
        fullName: user.name,
        currentAvatar: user.currentAvatar,
        avatarUrl: user.photoURL,
        avatars: user.avatars || []
      }
    });

    res.json({
      profile: {
        displayName: user.displayName,
        fullName: user.name,
        currentAvatar: user.currentAvatar,
        avatars: user.avatars || []
      }
    });
  } catch (err) {
    console.error('Error setting avatar:', err);
    res.status(500).json({ error: 'Failed to set current avatar' });
  }
});

// Get profile by UID
router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: 'Profile not found' });

    // Return profile data in the format expected by frontend
    res.json({
      uid: user.uid,
      displayName: user.displayName,
      fullName: user.name,
      name: user.name,
      phoneNumber: user.phoneNumber || '',
      email: user.email,
      photoURL: user.photoURL,
      currentAvatar: user.currentAvatar || user.photoURL,
      avatarUrl: user.photoURL,
      avatars: user.avatars || [],
      address: user.address || {},
      locationSettings: user.locationSettings || {},
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Upsert (create or update) profile by UID
router.post('/:uid', async (req: Request, res: Response) => {
  try {
    const update = { ...req.body, updatedAt: new Date() };

    // Map fullName to name if provided
    if (update.fullName) {
      update.name = update.fullName;
    }

    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: update },
      { new: true, upsert: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Failed to create/update user' });
    }

    // Emit real-time update
    const io = getIO();
    io.emit('profile_updated', {
      uid: req.params.uid,
      profile: {
        displayName: user.displayName,
        fullName: user.name,
        name: user.name,
        phoneNumber: user.phoneNumber,
        currentAvatar: user.currentAvatar,
        avatarUrl: user.photoURL,
        avatars: user.avatars || [],
        address: user.address
      }
    });

    res.json({
      uid: user.uid,
      displayName: user.displayName,
      fullName: user.name,
      name: user.name,
      phoneNumber: user.phoneNumber,
      currentAvatar: user.currentAvatar,
      avatarUrl: user.photoURL,
      avatars: user.avatars || [],
      address: user.address
    });
  } catch (err) {
    console.error('Error upserting profile:', err);
    res.status(500).json({ error: 'Failed to upsert profile' });
  }
});

export default router; 