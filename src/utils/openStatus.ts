/**
 * Determines if a restaurant/business is currently open based on its time slots.
 *
 * Time slots have the shape: { startTime: "08:00", endTime: "12:00", ... }
 * (matching the ITimeSlot model in the backend)
 *
 * Rules:
 *  - If the restaurant has no time slots, fall back to the static `openNow` field.
 *  - A restaurant is OPEN if the current local time falls within ANY active slot.
 *  - Handles overnight slots (e.g. 22:00 – 02:00).
 */

interface TimeSlot {
    startTime?: string; // "HH:mm"
    endTime?: string;   // "HH:mm"
    [key: string]: any;
}

/**
 * Convert "HH:mm" string to total minutes since midnight.
 */
function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * Returns true if the restaurant is currently open based on its time slots.
 *
 * @param restaurant - any object with optional `timeSlots` array and `openNow` fallback
 */
export function isRestaurantOpen(restaurant: {
    timeSlots?: TimeSlot[];
    openNow?: boolean;
    [key: string]: any;
}): boolean {
    const slots: TimeSlot[] = restaurant?.timeSlots ?? [];

    // No slots configured — fall back to static field
    if (!slots.length) {
        return !!restaurant?.openNow;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return slots.some(slot => {
        if (!slot.startTime || !slot.endTime) return false;

        const start = toMinutes(slot.startTime);
        const end = toMinutes(slot.endTime);

        if (end > start) {
            // Normal slot: e.g. 08:00 – 12:00
            return currentMinutes >= start && currentMinutes < end;
        } else {
            // Overnight slot: e.g. 22:00 – 02:00
            return currentMinutes >= start || currentMinutes < end;
        }
    });
}
