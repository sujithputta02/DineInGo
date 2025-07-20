"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
var mongoose_1 = require("mongoose");
var eventSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
eventSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Event = mongoose_1.default.model('Event', eventSchema);
