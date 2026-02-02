import { Hold } from '../models/Hold';
import { SlotService } from './SlotService';

export class SlotWorker {
    private static intervalId: NodeJS.Timeout | null = null;
    private static isRunning = false;

    static start(intervalMs: number = 10000) {
        if (this.intervalId) return;

        console.log('Starting SlotWorker...');
        this.intervalId = setInterval(async () => {
            if (this.isRunning) return;
            this.isRunning = true;

            try {
                await this.processExpiredHolds();
            } catch (error) {
                console.error('SlotWorker error:', error);
            } finally {
                this.isRunning = false;
            }
        }, intervalMs);
    }

    static stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private static async processExpiredHolds() {
        const expiredHolds = await Hold.find({
            status: 'active',
            expiresAt: { $lt: new Date() }
        }).limit(100); // Batch size to avoid memory issues

        if (expiredHolds.length > 0) {
            console.log(`Processing ${expiredHolds.length} expired holds`);
            for (const hold of expiredHolds) {
                try {
                    await SlotService.releaseHold(hold.holdId);
                    // Optional: Emit specific "timeout" event to user if socket connected
                } catch (err) {
                    console.error(`Failed to release hold ${hold.holdId}`, err);
                }
            }
        }
    }
}
