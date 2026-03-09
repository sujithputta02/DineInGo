import express from 'express';
import axios from 'axios';

const router = express.Router();

// Proxy for OpenStreetMap Nominatim API to avoid CORS issues
router.get('/search', async (req, res) => {
  try {
    const { q, postalcode, countrycodes, limit, addressdetails, extratags, namedetails } = req.query;

    // Build the Nominatim API URL
    const params = new URLSearchParams();
    params.append('format', 'json');
    
    if (q) params.append('q', q as string);
    if (postalcode) params.append('postalcode', postalcode as string);
    if (countrycodes) params.append('countrycodes', countrycodes as string);
    if (limit) params.append('limit', limit as string);
    if (addressdetails) params.append('addressdetails', addressdetails as string);
    if (extratags) params.append('extratags', extratags as string);
    if (namedetails) params.append('namedetails', namedetails as string);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    // Make request to Nominatim with proper headers
    const response = await axios.get(nominatimUrl, {
      headers: {
        'User-Agent': 'DineInGo/1.0 (contact@dinelngo.com)',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Geocoding error:', error.message);
    
    if (error.response?.status === 429) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.',
        fallback: true 
      });
    } else {
      res.status(500).json({ 
        error: 'Geocoding service unavailable',
        fallback: true 
      });
    }
  }
});

export default router;
