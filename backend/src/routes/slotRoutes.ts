import express from 'express';
import { SlotService } from '../services/SlotService';

const router = express.Router();

router.post('/slots/:slotId/hold', async (req, res) => {
    try {
        const { slotId } = req.params;
        const { userId, qty } = req.body;

        if (!userId || !qty) {
            return res.status(400).json({ error: 'Missing userId or qty' });
        }

        // Lazy load slot check? Or assume frontend knows slotId.
        // Spec: "Slot = restaurantId|2025-12-24T19:00"
        // The service handles lazy creation if we pass enough info, 
        // but here we might need to parse slotId to get resource info if it doesn't exist.
        // For simplicity, we assume slot exists or has been seeded, 
        // OR we modify getOrCreate to run here if not found.
        const parts = slotId.split('_');
        if (parts.length >= 3) {
            // Try ensuring it exists
            const type = parts[0] as 'restaurant' | 'event';
            const resourceId = parts[1];
            // timestamp might be remaining parts join
            const timeStr = parts.slice(2).join('_');
            const startTime = new Date(parseInt(timeStr));

            await SlotService.getOrCreateSlot(resourceId, type, startTime);
        }

        const result = await SlotService.createHold(slotId, userId, qty);
        res.json(result);
    } catch (error: any) {
        if (error.message === 'No capacity') {
            res.status(409).json({ error: 'no_capacity' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

router.post('/holds/:holdId/confirm', async (req, res) => {
    try {
        const { holdId } = req.params;
        const { paymentDetails, idempotencyKey } = req.body;

        if (!idempotencyKey) {
            return res.status(400).json({ error: 'Missing idempotencyKey' });
        }

        const booking = await SlotService.confirmBooking(holdId, paymentDetails, idempotencyKey);
        res.json({ status: 'confirmed', booking });
    } catch (error: any) {
        if (error.message === 'Hold expired' || error.message === 'Hold expired or invalid') {
            res.status(409).json({ error: 'hold_expired' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

router.post('/holds/:holdId/cancel', async (req, res) => {
    try {
        const { holdId } = req.params;
        await SlotService.releaseHold(holdId);
        res.json({ status: 'cancelled' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/slots/:slotId', async (req, res) => {
    try {
        const { slotId } = req.params;
        const slot = await SlotService.getSlotStatus(slotId);
        if (!slot) return res.status(404).json({ error: 'Slot not found' });

        res.json({
            capacity: slot.capacity,
            reserved: slot.reserved,
            remaining: slot.capacity - slot.reserved,
            heldCount: slot.heldCount,
            confirmedCount: slot.confirmedCount
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/slots/:slotId/waitlist', async (req, res) => {
    try {
        const { slotId } = req.params;
        const { userId, qty } = req.body;
        const result = await SlotService.joinWaitlist(slotId, userId, qty);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
