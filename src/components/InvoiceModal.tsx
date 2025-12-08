import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import type { Booking } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoiceModalProps {
  booking: Booking;
  onClose: () => void;
  isDarkMode: boolean;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, onClose, isDarkMode }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210;
    const imgHeight = canvas.height * imgWidth / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`DineInGo_Invoice_${booking.id}.pdf`);
  };

  const printInvoice = () => {
    const printContent = document.getElementById('invoice-content');
    const originalContents = document.body.innerHTML;

    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
    }
  };

  // Calculate amounts from booking data
  const isEvent = !!(booking.eventId || booking.eventName);
  const bookingName = booking.eventName || booking.restaurantName || 'Booking';

  // Use totalAmount from booking if available, otherwise calculate
  let subtotal = 0;
  let total = 0;

  if (booking.totalAmount) {
    // If totalAmount exists, calculate backwards (totalAmount includes tax)
    total = Number(booking.totalAmount);
    subtotal = total / 1.18; // Remove 18% tax to get subtotal
  } else {
    // Fallback calculation if totalAmount is not available
    const itemsTotal = (booking.selectedItems ?? []).reduce((sum: number, item: { price: number; quantity: number }) => sum + (item.price * item.quantity), 0);
    subtotal = itemsTotal;
    total = subtotal * 1.18;
  }

  const tax = total - subtotal; // 18% tax
  const pricePerUnit = Number(booking.guests) > 0 ? subtotal / Number(booking.guests) : subtotal;

  const invoiceNumber = `INV-${booking._id || booking.id}-${new Date().getFullYear()}`;
  const invoiceDate = new Date().toLocaleDateString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Invoice</h2>
          <div className="flex gap-3">
            <button
              onClick={printInvoice}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Print Invoice"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={generatePDF}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8" id="invoice-content" ref={invoiceRef}>
          {/* Logo */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold">
              D<span className="relative">
                i
                <span className="absolute top-2.5 left-1.5 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full"></span>
              </span>neIn
              <span className="text-yellow-400">Go</span>
            </h1>
            <p className="text-sm text-gray-600">Reserve Dining & Events</p>
          </div>

          {/* Invoice Header */}
          <div className="flex justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold mb-1">Invoice</h2>
              <p className="text-gray-600">#{invoiceNumber}</p>
              <p className="text-gray-600">Date: {invoiceDate}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">DineInGo Inc.</p>
              <p className="text-gray-600">123 Foodie Street</p>
              <p className="text-gray-600">Mumbai, Maharashtra</p>
              <p className="text-gray-600">India</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
            <p className="font-medium">{booking.fullName || 'Guest'}</p>
            <p className="text-gray-600">{booking.email || 'N/A'}</p>
            <p className="text-gray-600">{booking.phoneNumber || 'N/A'}</p>
          </div>

          {/* Booking Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Booking Details:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">{isEvent ? 'Event:' : 'Restaurant:'}</p>
                <p className="font-medium">{bookingName}</p>
              </div>
              <div>
                <p className="text-gray-600">Date & Time:</p>
                <p className="font-medium">
                  {new Date(booking.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} at {booking.time}
                </p>
              </div>
              <div>
                <p className="text-gray-600">{isEvent ? 'Attendees:' : 'Guests:'}</p>
                <p className="font-medium">{booking.guests} {Number(booking.guests) === 1 ? 'Person' : 'People'}</p>
              </div>
              {!isEvent && (
                <div>
                  <p className="text-gray-600">Table:</p>
                  <p className="font-medium">{booking.table ? `Table ${booking.table}` : 'Not assigned'}</p>
                </div>
              )}
              {isEvent && booking.selectedSeats && booking.selectedSeats.length > 0 && (
                <div>
                  <p className="text-gray-600">Seats:</p>
                  <p className="font-medium">{booking.selectedSeats.join(', ')}</p>
                </div>
              )}
              {booking.specialRequest && (
                <div className="col-span-2">
                  <p className="text-gray-600">Special Request:</p>
                  <p className="font-medium">{booking.specialRequest}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Display main booking item */}
                <tr className="border-b border-gray-200">
                  <td className="py-3">
                    {isEvent ? 'Event Registration' : 'Dining Reservation'} - {bookingName}
                  </td>
                  <td className="py-3 text-right">{booking.guests}</td>
                  <td className="py-3 text-right">₹{pricePerUnit.toFixed(2)}</td>
                  <td className="py-3 text-right">₹{subtotal.toFixed(2)}</td>
                </tr>

                {/* Display Selected Food Items if any */}
                {(booking.selectedItems ?? []).map((item: { id: string; name: string; price: number; quantity: number }, idx: number) => (
                  <tr key={item.id || idx} className="border-b border-gray-200">
                    <td className="py-3">{item.name}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">₹{item.price.toFixed(2)}</td>
                    <td className="py-3 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="font-medium">Tax (18%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-lg">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-8 flex items-center justify-center">
            <div className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-semibold inline-flex items-center">
              <span className="mr-2">●</span> {booking.status}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm mt-8 pt-8 border-t border-gray-200">
            <p>Thank you for choosing DineInGo!</p>
            <p>For any questions regarding this invoice, please contact support@dineingo.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
