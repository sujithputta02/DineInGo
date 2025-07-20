import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Paper, CircularProgress, Alert } from '@mui/material';

const DebugPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/debug/bookings');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Debug API response:', data);
      setBookings(data.bookings || []);
    } catch (err: any) {
      console.error('Debug fetch error:', err);
      setError(err.message || 'Failed to fetch bookings from MongoDB');
    } finally {
      setLoading(false);
    }
  };

  const testBookingCreation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create a test booking
      const testBooking = {
        restaurantName: 'Debug Test Restaurant',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        guests: '2',
        table: 'T1',
        fullName: 'Test User',
        email: 'test@example.com',
        phoneNumber: '123-456-7890',
        status: 'Confirmed'
      };
      
      // Send booking to API
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testBooking)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create booking: ${response.status} - ${errorText}`);
      }
      
      const savedBooking = await response.json();
      console.log('Test booking created:', savedBooking);
      
      // Refresh bookings list
      fetchDebugBookings();
      
    } catch (err: any) {
      console.error('Test booking error:', err);
      setError(err.message || 'Failed to create test booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        MongoDB Debug Page
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          This page helps verify that MongoDB is working correctly and bookings are being stored.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={fetchDebugBookings}
            disabled={loading}
          >
            Fetch Bookings from MongoDB
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={testBookingCreation}
            disabled={loading}
          >
            Create Test Booking
          </Button>
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {bookings.length > 0 ? (
          <>
            <Typography variant="h6" gutterBottom>
              Found {bookings.length} bookings in MongoDB:
            </Typography>
            
            {bookings.map((booking) => (
              <Paper key={booking._id} elevation={2} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {booking.restaurantName} - {booking.status}
                </Typography>
                <Typography variant="body2">
                  Date: {booking.date} at {booking.time}
                </Typography>
                <Typography variant="body2">
                  Guests: {booking.guests} - Table: {booking.table}
                </Typography>
                <Typography variant="body2">
                  Name: {booking.fullName} ({booking.email})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ID: {booking._id || booking.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {new Date(booking.createdAt).toLocaleString()}
                </Typography>
              </Paper>
            ))}
          </>
        ) : (
          !loading && (
            <Alert severity="info">
              No bookings found in MongoDB. Try creating a test booking.
            </Alert>
          )
        )}
      </Box>
    </Container>
  );
};

export default DebugPage;
