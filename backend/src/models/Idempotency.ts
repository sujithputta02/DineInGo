import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotency extends Document {
    key: string;
    result: any;
    expiresAt: Date;
    createdAt: Date;
}

const idempotencySchema = new Schema<IIdempotency>({
    key: { type: String, required: true, unique: true },
    result: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true, index: { expires: '1s' } }, // TTL index
    createdAt: { type: Date, default: Date.now }
});

export const Idempotency = mongoose.model<IIdempotency>('Idempotency', idempotencySchema);
