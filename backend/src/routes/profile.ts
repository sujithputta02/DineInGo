import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { uploadCloud as upload } from '../config/cloudinary';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { getIO } from '../utils/socket';

const router = express.Router();

// Avatar upload endpoint - supports both file upload and base64
router.post('/:uid/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    let avatarUrl: string;

    // Check if base64 image is provided
    if (req.body.base64Image) {
      console.log('Uploading base64 image to Cloudinary...');
      
      const cloudinary = require('cloudinary').v2;
      
      // Upload base64 to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.body.base64Image, {
        folder: 'dineingo/avatars',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });
      
      avatarUrl = uploadResult.secure_url;
      console.log('Base64 image uploaded to Cloudinary:', avatarUrl);
    } else if (req.file) {
      // File upload via multer
      avatarUrl = req.file.path;
      console.log('File uploaded to Cloudinary:', avatarUrl);
    } else {
      return res.status(400).json({ error: 'No file or base64 image provided' });
    }

    // Add avatar to avatars array and set as currentAvatar in User model
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $push: { avatars: avatarUrl },
        $set: {
          currentAvatar: avatarUrl,
          photoURL: avatarUrl,
          updatedAt: new Date()
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
    res.status(500).json({ error: 'Failed to upload avatar', details: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get avatar image endpoint (Legacy support for users still using DB binary)
router.get('/:uid/avatar/image', async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });

    // If they have a cloudinary URL, redirect them there
    if (user?.photoURL && user.photoURL.includes('res.cloudinary.com')) {
      return res.redirect(user.photoURL);
    }

    if (!user || !user.profilePicture || !user.profilePicture.data) {
      return res.status(404).send('No profile picture found');
    }

    res.contentType(user.profilePicture.contentType as string);
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

// Delete avatar from user's avatars array
router.delete('/:uid/avatar/delete', async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    
    console.log('Delete avatar request:', { uid: req.params.uid, avatarUrl });
    
    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      {
        $pull: { avatars: avatarUrl },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If the deleted avatar was the current one, clear it
    if (user.currentAvatar === avatarUrl || user.photoURL === avatarUrl) {
      user.currentAvatar = '';
      user.photoURL = '';
      await user.save();
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

    console.log('Avatar deleted successfully:', { avatarsCount: user.avatars?.length });

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      avatars: user.avatars || []
    });
  } catch (err) {
    console.error('Error deleting avatar:', err);
    res.status(500).json({ error: 'Failed to delete avatar' });
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