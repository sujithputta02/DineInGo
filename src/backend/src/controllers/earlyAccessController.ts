import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Store the file in the backend root for easy access
const DATA_FILE = path.join(__dirname, '../../early-access-leads.json');

interface Lead {
    email: string;
    userType: 'user' | 'business';
    joinedAt: string;
}

interface Leads {
    foodies: Lead[];
    venues: Lead[];
}

// Load existing leads from file
const loadLeads = (): Leads => {
    if (!fs.existsSync(DATA_FILE)) {
        return { foodies: [], venues: [] };
    }
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { foodies: [], venues: [] };
    }
};

// Save leads to file
const saveLeads = (leads: Leads): void => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf-8');
};

// POST /api/early-access/join
export const joinEarlyAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, userType } = req.body;

        if (!email || !userType || !['user', 'business'].includes(userType)) {
            res.status(400).json({ success: false, message: 'Valid email and userType (user or business) are required.' });
            return;
        }

        const leads = loadLeads();
        const list = userType === 'user' ? leads.foodies : leads.venues;

        // Check for duplicates
        const existing = list.find(l => l.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            res.status(200).json({ success: true, message: "You're already on the list! Dino is guarding your spot 🦖" });
            return;
        }

        const newLead: Lead = {
            email: email.toLowerCase().trim(),
            userType,
            joinedAt: new Date().toISOString(),
        };

        list.push(newLead);
        saveLeads(leads);

        console.log(`✅ New early access signup: ${email} (${userType === 'user' ? 'Foodie' : 'Venue'})`);

        res.status(201).json({
            success: true,
            message: 'Successfully joined early access!',
        });
    } catch (error) {
        console.error('Error joining early access:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// GET /api/early-access/list  (admin use)
export const listEarlyAccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const leads = loadLeads();
        res.json({
            success: true,
            foodies: {
                count: leads.foodies.length,
                emails: leads.foodies,
            },
            venues: {
                count: leads.venues.length,
                emails: leads.venues,
            },
            total: leads.foodies.length + leads.venues.length,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error reading leads.' });
    }
};
