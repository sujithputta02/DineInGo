import nodemailer from 'nodemailer';
import { storeReservationEmail, getReservationEmails } from '../firebase/emailStorage';

interface EmailCredentials {
  email: string;
  password: string;
}

// Function to create transporter with dynamic credentials
const createTransporter = (credentials: EmailCredentials) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: credentials.email,
      pass: credentials.password
    }
  });
};

interface ReservationData {
  fullName: string;
  email: string;
  phoneNumber: string;
  occasion?: string;
  specialRequest?: string;
  date: string;
  time: string;
  guests: string;
  table: string;
  restaurantName: string;
  reservationId: string;
  userCredentials?: EmailCredentials;
}

export const sendReservationEmail = async (data: ReservationData) => {
  try {
    console.log('Attempting to send email to:', data.email);
    
    // Use user credentials if provided, otherwise use default
    const credentials = data.userCredentials || {
      email: import.meta.env.VITE_EMAIL_USER,
      password: import.meta.env.VITE_EMAIL_PASSWORD
    };
    
    console.log('Using email service:', credentials.email);
    
    // Create transporter with credentials
    const transporter = createTransporter(credentials);
    
    // Verify transporter configuration
    await new Promise((resolve, reject) => {
      transporter.verify(function(error) {
        if (error) {
          console.error('Email transporter verification failed:', error);
          reject(error);
        } else {
          console.log('Email transporter is ready to send emails');
          resolve(true);
        }
      });
    });

    // Store the email in Firebase
    const storedEmailId = await storeReservationEmail(data.email, data.fullName, data.reservationId);
    console.log('Email stored in Firebase with ID:', storedEmailId);

    // Create email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2E7D32; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">Booking Confirmed!</h1>
        </div>
        
        <div style="padding: 20px; background-color: white;">
          <p style="font-size: 16px; color: #333;">Dear ${data.fullName},</p>
          
          <p style="font-size: 16px; color: #333;">Your booking at ${data.restaurantName} has been confirmed! We're looking forward to serving you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2E7D32; margin-top: 0;">Booking Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;"><strong>Date:</strong> ${data.date}</li>
              <li style="margin-bottom: 10px;"><strong>Time:</strong> ${data.time}</li>
              <li style="margin-bottom: 10px;"><strong>Number of Guests:</strong> ${data.guests}</li>
              <li style="margin-bottom: 10px;"><strong>Table:</strong> ${data.table}</li>
              ${data.occasion ? `<li style="margin-bottom: 10px;"><strong>Occasion:</strong> ${data.occasion}</li>` : ''}
              ${data.specialRequest ? `<li style="margin-bottom: 10px;"><strong>Special Request:</strong> ${data.specialRequest}</li>` : ''}
            </ul>
          </div>

          <p style="font-size: 16px; color: #333;">If you need to make any changes to your booking, please contact us at least 2 hours before your scheduled time.</p>
          
          <p style="font-size: 16px; color: #333;">We look forward to seeing you!</p>
        </div>
        
        <div style="background-color:rgb(0, 0, 0); padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 0;">Best regards,<br>The ${data.restaurantName} Team</p>
        </div>
      </div>
    `;

    // Send email to the user's email address
    const mailOptions = {
      from: {
        name: data.restaurantName,
        address: credentials.email
      },
      to: data.email,
      replyTo: data.email,
      subject: `Booking Confirmation - ${data.restaurantName}`,
      html: emailContent
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Detailed error sending email:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const sendBulkReservationEmails = async (reservationId: string, restaurantName: string) => {
  try {
    const emails = await getReservationEmails(reservationId);
    
    for (const emailData of emails) {
      await sendReservationEmail({
        ...emailData,
        restaurantName,
        reservationId,
        // Add other required fields with default values
        phoneNumber: '',
        date: '',
        time: '',
        guests: '',
        table: ''
      });
    }
    
    return { success: true, count: emails.length };
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    throw error;
  }
}; 