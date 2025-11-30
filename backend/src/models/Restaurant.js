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
exports.Restaurant = void 0;
var mongoose_1 = __importStar(require("mongoose"));
var menuItemSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    isVegetarian: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false }
});
var locationSchema = new mongoose_1.Schema({
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true }
});
var restaurantSchema = new mongoose_1.Schema({
    restaurantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    cuisine: { type: [String], required: true },
    address: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    image: { type: String, required: true },
    location: { type: locationSchema, required: true },
    priceLevel: { type: Number, required: true, min: 1, max: 5 },
    openNow: { type: Boolean, default: true },
    phoneNumber: { type: String, required: true },
    menu: [{ type: menuItemSchema, required: true }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
restaurantSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
// Force delete the model to ensure clean slate
if (mongoose_1.default.models.Restaurant) {
    delete mongoose_1.default.models.Restaurant;
}
// Create new model
var Restaurant = mongoose_1.default.model('Restaurant', restaurantSchema);
exports.Restaurant = Restaurant;
