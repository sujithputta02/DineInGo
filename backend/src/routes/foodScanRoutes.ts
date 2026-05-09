import express from 'express';
import { FoodScan } from '../models/FoodScan';

const router = express.Router();

// Log a new food scan
router.post('/log', async (req, res) => {
  try {
    const { userId, foodName, confidence, source, metadata, imageData, correctedName } = req.body;
    
    if (!userId || !foodName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let imageBuffer;
    if (imageData && typeof imageData === 'string' && imageData.includes('base64')) {
      imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');
    }

    const scan = new FoodScan({
      userId,
      foodName,
      confidence,
      source,
      metadata,
      imageData: imageBuffer,
      correctedName
    });

    await scan.save();
    res.status(201).json(scan);
  } catch (error) {
    console.error('Error logging scan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a scan with user correction (Self-Learning)
router.patch('/correct/:scanId', async (req, res) => {
  try {
    const { correctedName } = req.body;
    const { scanId } = req.params;

    const scan = await FoodScan.findByIdAndUpdate(
      scanId,
      { correctedName },
      { new: true }
    );

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    res.json(scan);
  } catch (error) {
    console.error('Error correcting scan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get scan history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await FoodScan.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Convert Buffer back to Base64 for the frontend
    const historyWithImages = history.map(scan => {
      const scanObj = scan.toObject();
      if (scan.imageData) {
        scanObj.imageData = `data:image/jpeg;base64,${scan.imageData.toString('base64')}`;
      }
      return scanObj;
    });
    
    res.json(historyWithImages);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
