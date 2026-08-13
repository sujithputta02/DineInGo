import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Business } from '../models/Business';
import mongoose from 'mongoose';

/**
 * Get Heatmap data for a business
 * - Table Popularity: Bookings per table
 * - Time Popularity: Bookings by hour/day
 */
export const getHeatmapData = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: businessId } = req.params;
        const { period = '30d' } = req.query;

        let dateFilter: Date;
        switch (period) {
            case '7d': dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); break;
            case '30d': dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); break;
            case '90d': dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); break;
            default: dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // 1. Table Popularity
        const tablePopularity = await Booking.aggregate([
            {
                $match: {
                    businessId,
                    status: { $in: ['confirmed', 'completed'] },
                    date: { $gte: dateFilter },
                    tableId: { $ne: null }
                }
            },
            {
                $group: {
                    _id: '$tableId',
                    tableNumber: { $first: '$tableNumber' },
                    bookingCount: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { bookingCount: -1 } }
        ]);

        // 2. Time Popularity (by hour of day)
        const timePopularity = await Booking.aggregate([
            {
                $match: {
                    businessId,
                    status: { $in: ['confirmed', 'completed'] },
                    date: { $gte: dateFilter }
                }
            },
            {
                $group: {
                    _id: '$time',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Day of Week Popularity
        const dayPopularity = await Booking.aggregate([
            {
                $match: {
                    businessId,
                    status: { $in: ['confirmed', 'completed'] },
                    date: { $gte: dateFilter }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$date' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            tables: tablePopularity,
            time: timePopularity,
            days: dayPopularity
        });
    } catch (error) {
        console.error('Error fetching heatmap data:', error);
        res.status(500).json({ message: 'Error fetching heatmap data' });
    }
};

/**
 * Get Revenue Forecasting
 * - Based on historical 4-8 week averages
 */
export const getRevenueForecast = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: businessId } = req.params;

        // Get last 8 weeks of organic growth
        const pastWeeks = await Booking.aggregate([
            {
                $match: {
                    businessId,
                    status: { $in: ['confirmed', 'completed'] },
                    date: { $lte: new Date() }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        week: { $week: '$date' }
                    },
                    revenue: { $sum: '$amount' },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.week': -1 } },
            { $limit: 8 }
        ]);

        if (pastWeeks.length < 2) {
            res.json({ forecast: [], message: 'Insufficient data for forecasting' });
            return;
        }

        // Simple forecasting: average weekly growth
        const reversedWeeks = [...pastWeeks].reverse();
        const revenues = reversedWeeks.map(w => w.revenue);

        // Calculate simple moving average growth rate
        let totalGrowth = 0;
        for (let i = 1; i < revenues.length; i++) {
            const growth = revenues[i - 1] > 0 ? (revenues[i] - revenues[i - 1]) / revenues[i - 1] : 0;
            totalGrowth += growth;
        }
        const avgGrowthRate = totalGrowth / (revenues.length - 1);

        // Project next 4 weeks
        const forecast = [];
        let lastRevenue = revenues[revenues.length - 1];
        const lastWeek = reversedWeeks[reversedWeeks.length - 1]._id;

        for (let i = 1; i <= 4; i++) {
            lastRevenue = lastRevenue * (1 + avgGrowthRate);
            forecast.push({
                week: lastWeek.week + i,
                projectedRevenue: Math.round(lastRevenue),
                confidence: Math.max(0.5, 1 - (i * 0.1)) // Confidence drops over time
            });
        }

        res.json({
            historical: reversedWeeks,
            forecast,
            avgGrowthRate: Math.round(avgGrowthRate * 100) + '%'
        });
    } catch (error) {
        console.error('Error fetching revenue forecast:', error);
        res.status(500).json({ message: 'Error fetching revenue forecast' });
    }
};

/**
 * Get Customer Loyalty
 * - Identify top spenders and frequent guests
 */
export const getCustomerLoyalty = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id: businessId } = req.params;
        const { limit = 10 } = req.query;

        const loyaltyData = await Booking.aggregate([
            {
                $match: {
                    businessId,
                    status: { $in: ['confirmed', 'completed'] }
                }
            },
            {
                $group: {
                    _id: '$customerEmail',
                    name: { $first: '$customerName' },
                    visitCount: { $sum: 1 },
                    totalSpent: { $sum: '$amount' },
                    lastVisit: { $max: '$date' },
                    phone: { $first: '$customerPhone' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: Number(limit) }
        ]);

        res.json(loyaltyData);
    } catch (error) {
        console.error('Error fetching customer loyalty:', error);
        res.status(500).json({ message: 'Error fetching customer loyalty' });
    }
};
