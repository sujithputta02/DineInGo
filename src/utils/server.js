import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const dbName = 'dineingo';

app.get('/api/reservations', async (req, res) => {
    const { userId } = req.query;
    try {
      await client.connect();
      const db = client.db(dbName);
      const reservations = db.collection('reservations');
      const query = userId ? { userId } : {};
      const results = await reservations.find(query).toArray();
      res.status(200).json({ success: true, reservations: results });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await client.close();
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
