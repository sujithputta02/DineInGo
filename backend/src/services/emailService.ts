import nodemailer from 'nodemailer';

interface ReviewEmailData {
    to: string;
    userName: string;
    businessName: string;
    rating?: number;
    comment?: string;
    replyText?: string;
}

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email credentials not configured');
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const emailService = {
    /**
     * Send email to user confirming their review submission
     */
    async sendReviewSubmissionEmail(data: ReviewEmailData): Promise<boolean> {
        try {
            const transporter = createTransporter();
            if (!transporter) return false;

            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Thanks for your review!</h2>
          <p>Hi ${data.userName},</p>
          <p>Thank you for taking the time to review <strong>${data.businessName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Rating:</strong> ${'★'.repeat(data.rating || 0)}</p>
            <p><strong>Your Comment:</strong></p>
            <p style="font-style: italic;">"${data.comment}"</p>
          </div>

          <p>Your feedback helps others make better dining choices!</p>
          <p>Best regards,<br>The DineInGo Team</p>
        </div>
      `;

            await transporter.sendMail({
                from: `"DineInGo" <${process.env.EMAIL_USER}>`,
                to: data.to,
                subject: `Start Rating: You reviewed ${data.businessName}`,
                html,
            });

            console.log(`Review submission email sent to ${data.to}`);
            return true;
        } catch (error) {
            console.error('Error sending review submission email:', error);
            return false;
        }
    },

    /**
     * Send email to user when business replies to their review
     */
    async sendReplyNotificationEmail(data: ReviewEmailData): Promise<boolean> {
        try {
            const transporter = createTransporter();
            if (!transporter) return false;

            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">New Reply to Your Review</h2>
          <p>Hi ${data.userName},</p>
          <p>The owner of <strong>${data.businessName}</strong> has replied to your review.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Their Reply:</strong></p>
            <p style="font-style: italic; color: #1f2937;">"${data.replyText}"</p>
          </div>

          <p>You can view the full conversation in your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard">Dashboard</a>.</p>
          <p>Best regards,<br>The DineInGo Team</p>
        </div>
      `;

            await transporter.sendMail({
                from: `"DineInGo" <${process.env.EMAIL_USER}>`,
                to: data.to,
                subject: `New Reply from ${data.businessName}`,
                html,
            });

            console.log(`Reply notification email sent to ${data.to}`);
            return true;
        } catch (error) {
            console.error('Error sending reply notification email:', error);
            return false;
        }
    }
};

// Generic email sending function
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    try {
        const transporter = createTransporter();
        if (!transporter) return false;

        await transporter.sendMail({
            from: `"DineInGo" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
        });

        console.log(`Email sent to ${options.to}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
