import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Booking } from '../models/Booking';
import { Business } from '../models/Business';
import fs from 'fs';
import path from 'path';

interface InvoiceData {
    invoiceNumber: string;
    date: Date;
    business: {
        name: string;
        address: string;
        phone: string;
        email: string;
    };
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    booking: {
        id: string;
        date: Date;
        time: string;
        guests: number;
        tableNumber?: string;
    };
    items: {
        description: string;
        quantity: number;
        rate: number;
        amount: number;
    }[];
    subtotal: number;
    tax: number;
    total: number;
}

// Generate PDF invoice
export const generatePDFInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookingId } = req.params;

        // Fetch booking details
        const booking = await Booking.findById(bookingId).lean();
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }

        // Fetch business details
        const business = await Business.findById(booking.businessId).lean();
        if (!business) {
            res.status(404).json({ success: false, message: 'Business not found' });
            return;
        }

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${booking._id.toString().slice(-6)}`;

        // Prepare invoice data
        const invoiceData: InvoiceData = {
            invoiceNumber,
            date: new Date(),
            business: {
                name: business.name,
                address: (business as any).address || 'N/A',
                phone: (business as any).phone || 'N/A',
                email: (business as any).email || 'N/A'
            },
            customer: {
                name: (booking as any).userName || 'Guest',
                email: (booking as any).userEmail || 'N/A',
                phone: (booking as any).userPhone || 'N/A'
            },
            booking: {
                id: booking._id.toString(),
                date: booking.date,
                time: booking.time,
                guests: booking.seats || (booking as any).partySize || 1,
                tableNumber: (booking as any).tableNumber
            },
            items: [
                {
                    description: `Table Reservation - ${booking.seats || (booking as any).partySize || 1} guests`,
                    quantity: 1,
                    rate: booking.amount || 0,
                    amount: booking.amount || 0
                }
            ],
            subtotal: booking.amount || 0,
            tax: 0,
            total: booking.amount || 0
        };

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Generate PDF content
        generateInvoicePDF(doc, invoiceData);

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('Error generating PDF invoice:', error);
        res.status(500).json({ success: false, message: 'Error generating PDF invoice' });
    }
};

// Get all invoices for a business
export const getBusinessInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
        const { businessId } = req.params;
        const { startDate, endDate, limit = 50 } = req.query;

        const query: any = { businessId, status: 'confirmed' };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        const bookings = await Booking.find(query)
            .sort({ date: -1 })
            .limit(Number(limit))
            .lean();

        const invoices = bookings.map(booking => ({
            invoiceNumber: `INV-${booking._id.toString().slice(-6)}`,
            bookingId: booking._id,
            customerName: (booking as any).userName,
            customerEmail: (booking as any).userEmail,
            date: booking.date,
            amount: booking.amount,
            status: 'generated'
        }));

        res.json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ success: false, message: 'Error fetching invoices' });
    }
};

// Helper function to generate PDF content
function generateInvoicePDF(doc: PDFKit.PDFDocument, invoice: InvoiceData) {
    // Header
    doc.fontSize(20).text('INVOICE', 50, 50, { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(10);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 100);
    doc.text(`Date: ${invoice.date.toLocaleDateString()}`, 50, 115);
    doc.moveDown();

    // Business details
    doc.fontSize(12).text('From:', 50, 145);
    doc.fontSize(10);
    doc.text(invoice.business.name, 50, 165);
    doc.text(invoice.business.address, 50, 180);
    doc.text(`Phone: ${invoice.business.phone}`, 50, 195);
    doc.text(`Email: ${invoice.business.email}`, 50, 210);

    // Customer details
    doc.fontSize(12).text('Bill To:', 300, 145);
    doc.fontSize(10);
    doc.text(invoice.customer.name, 300, 165);
    doc.text(`Email: ${invoice.customer.email}`, 300, 180);
    doc.text(`Phone: ${invoice.customer.phone}`, 300, 195);

    // Booking details
    doc.moveDown(3);
    doc.fontSize(12).text('Booking Details:', 50, 250);
    doc.fontSize(10);
    doc.text(`Booking ID: ${invoice.booking.id}`, 50, 270);
    doc.text(`Date: ${invoice.booking.date.toLocaleDateString()}`, 50, 285);
    doc.text(`Time: ${invoice.booking.time}`, 50, 300);
    doc.text(`Guests: ${invoice.booking.guests}`, 50, 315);
    if (invoice.booking.tableNumber) {
        doc.text(`Table: ${invoice.booking.tableNumber}`, 50, 330);
    }

    // Items table
    const tableTop = 370;
    doc.fontSize(12).text('Items', 50, tableTop);

    // Table headers
    const headerY = tableTop + 25;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, headerY);
    doc.text('Qty', 300, headerY);
    doc.text('Rate', 370, headerY);
    doc.text('Amount', 470, headerY, { align: 'right' });

    // Draw line
    doc.moveTo(50, headerY + 15).lineTo(550, headerY + 15).stroke();

    // Table items
    doc.font('Helvetica');
    let itemY = headerY + 25;
    invoice.items.forEach(item => {
        doc.text(item.description, 50, itemY);
        doc.text(item.quantity.toString(), 300, itemY);
        doc.text(`₹${item.rate.toLocaleString()}`, 370, itemY);
        doc.text(`₹${item.amount.toLocaleString()}`, 470, itemY, { align: 'right' });
        itemY += 20;
    });

    // Draw line
    doc.moveTo(50, itemY + 5).lineTo(550, itemY + 5).stroke();

    // Totals
    const totalsY = itemY + 20;
    doc.font('Helvetica');
    doc.text('Subtotal:', 370, totalsY);
    doc.text(`₹${invoice.subtotal.toLocaleString()}`, 470, totalsY, { align: 'right' });

    if (invoice.tax > 0) {
        doc.text('Tax:', 370, totalsY + 20);
        doc.text(`₹${invoice.tax.toLocaleString()}`, 470, totalsY + 20, { align: 'right' });
    }

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total:', 370, totalsY + 40);
    doc.text(`₹${invoice.total.toLocaleString()}`, 470, totalsY + 40, { align: 'right' });

    // Footer
    doc.fontSize(10).font('Helvetica');
    doc.text('Thank you for your business!', 50, 700, { align: 'center' });
    doc.text('This is a computer-generated invoice.', 50, 715, { align: 'center' });
}
