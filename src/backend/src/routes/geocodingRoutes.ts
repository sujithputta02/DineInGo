import express from 'express';
import axios from 'axios';
import { getGoogleMapsApiKey } from '../utils/secretManager';

const router = express.Router();

// Proxy for Google Maps APIs to avoid CORS issues
router.get('/google/places', async (req, res) => {
  try {
    const { query, location, radius, type, photoreference, maxwidth } = req.query;
    const key = getGoogleMapsApiKey();

    let url = '';
    if (photoreference) {
      url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth || 400}&photoreference=${photoreference}&key=${key}`;
      // For photos, we might want to redirect or stream
      return res.redirect(url);
    } else if (location && radius) {
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type || 'restaurant'}&key=${key}`;
    } else {
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&key=${key}`;
    }

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error: any) {
    console.error('Google Places Proxy error:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Google Places service unavailable' });
  }
});

router.get('/google/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    const key = getGoogleMapsApiKey();

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${key}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error: any) {
    console.error('Google Geocode Proxy error:', error.message);
    res.status(error.response?.status || 500).json({ error: 'Geocoding service unavailable' });
  }
});

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
        'User-Agent': 'DineInGo/1.0 (contact@dineingo.com)',
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
