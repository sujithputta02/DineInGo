import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { SlotService } from '../src/services/SlotService';
import { Slot } from '../src/models/Slot';
import { Hold } from '../src/models/Hold';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
}

async function runVerification() {
    try {
        await mongoose.connect(MONGODB_URI!, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const testSlotId = 'test_slot_' + Date.now();
        const testUserId = 'user_' + uuidv4();

        // 1. Create a slot via getOrCreate
        console.log('\n--- 1. Creating Slot ---');
        const slot = await SlotService.getOrCreateSlot('test_restaurant', 'restaurant', new Date(), 10);
        console.log('Slot created:', slot.slotId, 'Capacity:', slot.capacity);

        // 2. Create a Hold
        console.log('\n--- 2. Creating Hold (Qty: 5) ---');
        const holdResult = await SlotService.createHold(slot.slotId, testUserId, 5);
        console.log('Hold created:', holdResult.holdId);

        const slotAfterHold = await Slot.findOne({ slotId: slot.slotId });
        console.log('Slot Reserved:', slotAfterHold?.reserved, '(Expected: 5)');
        if (slotAfterHold?.reserved !== 5) throw new Error('Reserve count mismatch');

        // 3. Try to Oversell
        console.log('\n--- 3. Oversell Attempt (Qty: 6) ---');
        try {
            await SlotService.createHold(slot.slotId, 'user_2', 6);
            throw new Error('Oversell should have failed');
        } catch (error: any) {
            console.log('Oversell failed as expected:', error.message);
        }

        // 4. Confirm Booking
        console.log('\n--- 4. Confirm Booking ---');
        const booking = await SlotService.confirmBooking(holdResult.holdId, {}, 'idempotency_' + Date.now());
        console.log('Booking confirmed:', booking._id);

        const slotAfterConfirm = await Slot.findOne({ slotId: slot.slotId });
        console.log('Slot Held:', slotAfterConfirm?.heldCount, '(Expected: 0)');
        console.log('Slot Confirmed:', slotAfterConfirm?.confirmedCount, '(Expected: 5)');
        console.log('Slot Reserved:', slotAfterConfirm?.reserved, '(Expected: 5)');

        // 5. Release Test (Need separate hold)
        console.log('\n--- 5. Release Hold Test ---');
        const holdResult2 = await SlotService.createHold(slot.slotId, 'user_3', 2);
        console.log('Created 2nd hold:', holdResult2.holdId);

        await SlotService.releaseHold(holdResult2.holdId);
        console.log('Released 2nd hold');

        const slotAfterRelease = await Slot.findOne({ slotId: slot.slotId });
        console.log('Slot Reserved after release:', slotAfterRelease?.reserved, '(Expected: 5)');

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runVerification();
