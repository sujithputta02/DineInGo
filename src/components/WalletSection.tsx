import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Download, Mail, Smartphone, Apple, Chrome } from 'lucide-react';
import { walletService, WalletPass, Invoice } from '../services/walletService';
import { toast } from 'react-toastify';

interface WalletSectionProps {
  booking?: any;
}

const WalletSection: React.FC<WalletSectionProps> = ({ booking }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const userInvoices = await walletService.getUserInvoices();
      setInvoices(userInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToAppleWallet = async (booking: any) => {
    try {
      const { passUrl } = await walletService.generateAppleWalletPass(booking);

      // Create a temporary link to download the pass
      const link = document.createElement('a');
      link.href = passUrl;
      link.download = `dineingo-booking-${booking.id || booking._id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Apple Wallet pass generated!');
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      toast.error('Failed to generate Apple Wallet pass');
    }
  };

  const handleAddToGoogleWallet = async (booking: any) => {
    try {
      const { passUrl } = await walletService.generateGoogleWalletPass(booking);

      // Open Google Wallet in a new tab
      window.open(passUrl, '_blank');

      toast.success('Google Wallet pass generated!');
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      toast.error('Failed to generate Google Wallet pass');
    }
  };

  const handleGenerateInvoice = async (booking: any) => {
    try {
      setLoading(true);
      const invoice = await walletService.generateInvoice(booking);

      // Send invoice via email
      await walletService.sendInvoiceEmail(invoice, booking);

      setSelectedInvoice(invoice);
      toast.success('Invoice generated and sent via email!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Generate PDF content (simplified for demo)
    const pdfContent = `
      DineInGo Invoice
      Invoice #: ${invoice.invoiceNumber}
      Date: ${new Date(invoice.date).toLocaleDateString()}
      Customer: ${invoice.customerName}
      Restaurant: ${invoice.restaurantName || invoice.eventName}
      Total: ₹${invoice.total}
    `;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Invoice downloaded!');
  };

  const handleTestEmail = async () => {
    try {
      setLoading(true);

      // Get current user's email
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      const userEmail = user?.email || 'test@example.com';

      // Create a test invoice
      const testInvoice: any = {
        id: 'test-invoice',
        invoiceNumber: 'TEST-001',
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerName: user?.displayName || 'Test User',
        customerEmail: userEmail,
        customerPhone: '+1234567890',
        restaurantName: 'Test Restaurant',
        items: [
          {
            name: 'Test Item',
            description: 'This is a test item',
            quantity: 1,
            unitPrice: 100,
            total: 100
          }
        ],
        subtotal: 100,
        tax: 18,
        total: 118,
        status: 'pending',
        bookingId: 'test-booking'
      };

      const testBooking = {
        id: 'test-booking',
        restaurantName: 'Test Restaurant',
        date: new Date().toLocaleDateString(),
        time: '7:00 PM',
        numberOfGuests: 2,
        status: 'confirmed'
      };

      // Send test email
      await walletService.sendInvoiceEmail(testInvoice, testBooking);

      toast.success(`Test email sent to ${userEmail}! Check your inbox.`);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-semibold">Digital Wallet & Invoices</h2>
      </div>

      {/* Quick Actions for Current Booking */}
      {booking && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
          <h3 className="font-semibold mb-3">Quick Actions for Current Booking</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleAddToAppleWallet(booking)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Apple className="w-4 h-4" />
              Add to Apple Wallet
            </button>
            <button
              onClick={() => handleAddToGoogleWallet(booking)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Chrome className="w-4 h-4" />
              Add to Google Wallet
            </button>
            <button
              onClick={() => handleGenerateInvoice(booking)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      )}

      {/* Invoices Section */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          Recent Invoices
        </h3>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No invoices yet</p>
            <p className="text-sm">Generate an invoice for your booking to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{invoice.restaurantName || invoice.eventName}</h4>
                    <p className="text-sm text-gray-600">Invoice #{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(invoice.date).toLocaleDateString()} • ₹{invoice.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleDownloadInvoice(invoice)}
                      className="p-2 text-gray-600 hover:text-emerald-600 transition-colors"
                      title="Download Invoice"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wallet Features Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-gray-600" />
          Wallet Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Apple Wallet</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Quick access to booking details</li>
              <li>• QR code for easy check-in</li>
              <li>• Location-based notifications</li>
              <li>• Offline access</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Google Wallet</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Digital ticket storage</li>
              <li>• Easy sharing with friends</li>
              <li>• Integration with Google services</li>
              <li>• Cross-platform compatibility</li>
            </ul>
          </div>
        </div>

        {/* Test Email Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleTestEmail}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {loading ? 'Sending Test Email...' : 'Test Email Setup'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Click to test if email functionality is working correctly
          </p>
        </div>
      </div>

      {/* Selected Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Invoice Generated!</h3>
            <div className="space-y-2 mb-4">
              <p><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}</p>
              <p><strong>Restaurant:</strong> {selectedInvoice.restaurantName || selectedInvoice.eventName}</p>
              <p><strong>Total:</strong> ₹{selectedInvoice.total}</p>
              <p><strong>Status:</strong> {selectedInvoice.status}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDownloadInvoice(selectedInvoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSection; 