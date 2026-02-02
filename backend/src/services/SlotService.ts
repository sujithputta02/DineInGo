import mongoose, { ClientSession } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Slot, ISlot } from '../models/Slot';
import { Hold, IHold } from '../models/Hold';
import { Waitlist, IWaitlist } from '../models/Waitlist';
import { Booking, IBooking } from '../models/Booking'; // Use existing Booking model
import { Idempotency } from '../models/Idempotency';
import { Event } from '../models/Event';
import { Restaurant } from '../models/Restaurant';

// Interface for IoC or just global access; simplified for now
let io: any;

export const setSocketIO = (socketIO: any) => {
    io = socketIO;
};

const emitUpdate = (slotId: string, data: any) => {
    if (io) {
        io.to(`slot:${slotId}`).emit('slot:update', data);
    }
};

export class SlotService {

    // Helper to get or create a slot (lazy creation for restaurants)
    static async getOrCreateSlot(resourceId: string, type: 'restaurant' | 'event', startTime: Date, capacity?: number): Promise<ISlot> {
        const slotId = `${type}_${resourceId}_${startTime.getTime()}`;

        let slot = await Slot.findOne({ slotId });
        if (!slot) {
            if (!capacity) {
                // Fetch default capacity if not provided
                if (type === 'event') {
                    const event = await Event.findById(resourceId);
                    if (!event) throw new Error('Event not found');
                    capacity = event.capacity;
                } else {
                    // For restaurants, this logic might need refinement based on business rules.
                    // For now, defaulting to a safe number or fetching from Restaurant model if it had global capacity.
                    // Assuming a default of 50 for restaurant slots if not specified.
                    capacity = 50;
                }
            }

            try {
                slot = await Slot.create({
                    slotId,
                    resourceId,
                    type,
                    startTime,
                    capacity
                });
            } catch (error: any) {
                // Handle race condition where another request created it
                if (error.code === 11000) {
                    slot = await Slot.findOne({ slotId });
                    if (!slot) throw new Error('Slot creation race condition failed');
                } else {
                    throw error;
                }
            }
        }
        return slot;
    }

    static async createHold(slotId: string, userId: string, qty: number): Promise<{ holdId: string, expiresAt: Date, remaining: number }> {
        const session = await mongoose.startSession();
        let result: { holdId: string, expiresAt: Date, remaining: number } | null = null;

        try {
            await session.withTransaction(async () => {
                const slot = await Slot.findOne({ slotId }).session(session);
                if (!slot) throw new Error('Slot not found');

                if (slot.reserved + qty > slot.capacity) {
                    throw new Error('No capacity');
                }

                const holdId = uuidv4();
                const ttlSec = 5 * 60; // 5 minutes
                const expiresAt = new Date(Date.now() + ttlSec * 1000);

                slot.reserved += qty;
                slot.heldCount += qty;
                await slot.save({ session });

                await Hold.create([{
                    holdId,
                    slotId,
                    userId,
                    qty,
                    status: 'active',
                    expiresAt
                }], { session });

                result = { holdId, expiresAt, remaining: slot.capacity - slot.reserved };
            });
        } finally {
            session.endSession();
        }

        if (result) {
            // Re-fetch or calculate reserved
            const currentSlot = await Slot.findOne({ slotId });
            emitUpdate(slotId, {
                slotId,
                remaining: (result as any).remaining,
                reserved: currentSlot?.reserved
            });
            return result;
        } else {
            throw new Error('Transaction failed');
        }
    }

    static async confirmBooking(holdId: string, paymentDetails: any, idempotencyKey: string): Promise<IBooking> {
        // 1. Idempotency Check
        const existing = await Idempotency.findOne({ key: idempotencyKey });
        if (existing) {
            if (existing.result.status === 'processing') {
                throw new Error('Processing'); // Or wait
            }
            return existing.result as IBooking;
        }

        // Mark processing
        await Idempotency.create({
            key: idempotencyKey,
            result: { status: 'processing' },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        const session = await mongoose.startSession();
        let booking: IBooking | null = null;
        let error: any = null;

        try {
            await session.withTransaction(async () => {
                const hold = await Hold.findOne({ holdId }).session(session);
                if (!hold || hold.status !== 'active') throw new Error('Hold expired or invalid');

                if (hold.expiresAt < new Date()) {
                    // Logic to handle just-expired holds inside transaction
                    throw new Error('Hold expired');
                }

                const slot = await Slot.findOne({ slotId: hold.slotId }).session(session);
                if (!slot) throw new Error('Slot not found');

                // Update Hold
                hold.status = 'converted';
                await hold.save({ session });

                // Update Slot
                slot.heldCount -= hold.qty;
                slot.confirmedCount += hold.qty;
                // reserved stays same (held + confirmed)
                await slot.save({ session });

                // Create Booking
                // Mapping fields to existing booking model
                // We use create with array for transaction support
                const bookings = await Booking.create([{
                    userId: hold.userId,
                    restaurantId: slot.type === 'restaurant' ? slot.resourceId : 'EVENT_PLACEHOLDER', // TODO: fix type
                    eventId: slot.type === 'event' ? slot.resourceId : undefined,
                    date: slot.startTime,
                    time: slot.startTime.toTimeString(), // format as needed
                    guests: hold.qty,
                    status: 'confirmed',
                    totalAmount: 0 // populate from paymentDetails if needed
                }], { session });

                booking = bookings[0];

                // Update Event registered count if applicable
                if (slot.type === 'event') {
                    await Event.findByIdAndUpdate(slot.resourceId, {
                        $inc: { registeredCount: hold.qty }
                    }, { session });
                }

            });
        } catch (err) {
            error = err;
        } finally {
            session.endSession();
        }

        if (error) {
            // Update idempotency to fail or remove it so they can retry
            await Idempotency.deleteOne({ key: idempotencyKey });
            throw error;
        }

        if (booking) {
            // Update Idempotency with final result
            await Idempotency.findOneAndUpdate({ key: idempotencyKey }, { result: booking });

            // Emit update
            const slot = await Slot.findOne({ slotId: (booking as any).slotId }); // Note: we didn't save slotId on booking
            // The helper methods above don't allow easy slotId access from booking unless we added it.
            // But we know holdId -> hold -> slotId.
            const hold = await Hold.findOne({ holdId });
            if (hold) {
                const slot = await Slot.findOne({ slotId: hold.slotId });
                if (slot) {
                    emitUpdate(hold.slotId, {
                        slotId: hold.slotId,
                        remaining: slot.capacity - slot.reserved,
                        confirmed: slot.confirmedCount
                    });
                }
            }

            return booking!;
        }

        throw new Error('Unexpected error in confirmBooking');
    }

    static async releaseHold(holdId: string): Promise<void> {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const hold = await Hold.findOne({ holdId }).session(session);
                if (!hold || hold.status !== 'active') return;

                hold.status = 'released';
                await hold.save({ session });

                const slot = await Slot.findOne({ slotId: hold.slotId }).session(session);
                if (slot) {
                    slot.reserved -= hold.qty;
                    slot.heldCount -= hold.qty;
                    await slot.save({ session });

                    // Waitlist Promotion
                    const available = slot.capacity - slot.reserved;
                    if (available > 0) {
                        const nextInLine = await Waitlist.findOne({
                            slotId: slot.slotId,
                            qty: { $lte: available },
                            notified: false
                        }).sort({ createdAt: 1 }).session(session);

                        if (nextInLine) {
                            // Promote logic
                            // For now, we will just notify -> in real world we might auto-create a hold
                            // But simple "notify" is safer for "No Breaking Changes" constraints unless fully automated
                            nextInLine.notified = true;
                            await nextInLine.save({ session });
                            // NOTE: Actual notification (email/push) would happen after transaction commit
                        }
                    }
                }
            });

            // Post-transaction: emit updates
            const hold = await Hold.findOne({ holdId }); // fetch again for clean read
            if (hold) {
                const slot = await Slot.findOne({ slotId: hold.slotId });
                if (slot) {
                    emitUpdate(hold.slotId, {
                        slotId: hold.slotId,
                        remaining: slot.capacity - slot.reserved
                    });
                }
            }

        } finally {
            session.endSession();
        }
    }

    static async joinWaitlist(slotId: string, userId: string, qty: number): Promise<IWaitlist> {
        return await Waitlist.create({
            slotId,
            userId,
            qty
        });
    }

    static async getSlotStatus(slotId: string) {
        return await Slot.findOne({ slotId });
    }
}
