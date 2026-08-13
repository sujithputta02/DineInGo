"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
var mongoose_1 = __importStar(require("mongoose"));
var seatSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    rowLabel: { type: String, required: true },
    number: { type: Number, required: true },
    status: { type: String, enum: ['available', 'selected', 'booked'], default: 'available' },
    tier: { type: String, enum: ['standard', 'premium', 'vip'], default: 'standard' },
    price: { type: Number, required: true },
    bookedBy: { type: String }
}, { _id: false });
var seatingLayoutSchema = new mongoose_1.Schema({
    rows: { type: Number, required: true },
    columns: { type: Number, required: true },
    seats: [seatSchema]
}, { _id: false });
var eventSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true, default: 100 },
    registeredCount: { type: Number, default: 0 },
    price: { type: Number, required: true, default: 0 },
    category: { type: String },
    organizer: { type: String },
    imageUrl: { type: String },
    seatingLayout: { type: seatingLayoutSchema },
    hasSeating: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
eventSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Event = mongoose_1.default.model('Event', eventSchema);
