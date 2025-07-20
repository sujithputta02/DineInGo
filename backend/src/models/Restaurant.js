"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Restaurant = void 0;
var mongoose_1 = require("mongoose");
var restaurantSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    cuisine: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
restaurantSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
exports.Restaurant = mongoose_1.default.model('Restaurant', restaurantSchema);
