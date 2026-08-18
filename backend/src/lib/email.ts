import nodemailer from 'nodemailer';

/**
 * Helper: Promise that rejects after timeout (milliseconds)
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

/**
 * Send email with Brevo SMTP (primary) and Gmail SMTP (fallback)
 * Strategy: Try Brevo SMTP first for best deliverability, fallback to Gmail SMTP if it fails
 * Both operations have strict timeouts to prevent hanging
 * Returns true if email sent, false if all providers failed (but doesn't throw)
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    console.log('[Email Service] Starting email send process...');
    console.log('[Email Service] Checking credentials availability:');
    console.log('  - BREVO_SMTP_HOST:', !!process.env.BREVO_SMTP_HOST);
    console.log('  - BREVO_SMTP_USER:', !!process.env.BREVO_SMTP_USER);
    console.log('  - BREVO_SMTP_PASS:', !!process.env.BREVO_SMTP_PASS);
    console.log('  - EMAIL_USER:', !!process.env.EMAIL_USER);
    console.log('  - EMAIL_PASS:', !!process.env.EMAIL_PASS);
    
    // NOTE: Gmail may work better on Vercel because Brevo might have IP whitelist restrictions
    // Try Gmail first, then fallback to Brevo
    
    // PRIORITY 1: Gmail SMTP (works better on Vercel serverless)
    if (process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
        try {
            console.log(`📧 [V1] Attempting Brevo SMTP for: ${to}`);
            console.log(`📧 [V1] Brevo Host: ${process.env.BREVO_SMTP_HOST}`);
            console.log(`📧 [V1] Brevo Port: ${Number(process.env.BREVO_SMTP_PORT) || 587}`);
            console.log(`📧 [V1] Brevo User: ${process.env.BREVO_SMTP_USER}`);
            
            const transporter = nodemailer.createTransport({
                host: process.env.BREVO_SMTP_HOST,
                port: Number(process.env.BREVO_SMTP_PORT) || 587,
                secure: false,
                auth: {
                    user: process.env.BREVO_SMTP_USER,
                    pass: process.env.BREVO_SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.2'
                },
                connectionTimeout: 10000,
                socketTimeout: 10000,
            });

            console.log('📧 [V1] Verifying transporter connection...');
            await withTimeout(
                new Promise((resolve, reject) => {
                    transporter.verify((error, success) => {
                        if (error) {
                            console.error('📧 [V1] Transporter verification failed:', error);
                            reject(error);
                        } else {
                            console.log('📧 [V1] Transporter verification successful');
                            resolve(success);
                        }
                    });
                }),
                5000,
                'Brevo transporter verify'
            );

            const sendPromise = transporter.sendMail({
                from: process.env.BREVO_FROM || '"DineInGo 🦖" <sec.dinelngo.team@gmail.com>',
                to,
                subject,
                html,
                headers: {
                    'X-Priority': '1',
                    'X-Mailer': 'DineInGo Early Access v1.2',
                },
                text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
            });

            console.log('⏳ [V1] Sending email via Brevo...');
            const info = await withTimeout(sendPromise, 6000, 'Brevo SMTP send');
            console.log('✅ [V1] Brevo SMTP Success:', { messageId: info.messageId, to });
            return true;
        } catch (brevoError: any) {
            console.error('❌ [V1] Brevo SMTP Failed:', {
                message: brevoError?.message,
                code: brevoError?.code,
                to,
                stack: brevoError?.stack?.substring(0, 200)
            });
            // Fall through to Priority 2
        }
    } else {
        console.log('ℹ️ [V1] Brevo SMTP credentials missing:');
        console.log('  - Host:', process.env.BREVO_SMTP_HOST ? 'present' : 'MISSING');
        console.log('  - User:', process.env.BREVO_SMTP_USER ? 'present' : 'MISSING');
        console.log('  - Pass:', process.env.BREVO_SMTP_PASS ? 'present' : 'MISSING');
    }

    // PRIORITY 2: Gmail SMTP Fallback - 3 second timeout
    console.log(`📧 [V2] Attempting Gmail SMTP Fallback for: ${to}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('⚠️ [V2] Gmail credentials unavailable:');
        console.error('  - EMAIL_USER:', process.env.EMAIL_USER ? 'present' : 'MISSING');
        console.error('  - EMAIL_PASS:', process.env.EMAIL_PASS ? 'present' : 'MISSING');
        return false; // Not an error, just can't send
    }

    try {
        console.log(`📧 [V2] Gmail Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
        console.log(`📧 [V2] Gmail Port: ${Number(process.env.EMAIL_PORT) || 587}`);
        console.log(`📧 [V2] Gmail User: ${process.env.EMAIL_USER}`);
        
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
                minVersion: 'TLSv1.2'
            },
            // Performance optimizations for high-volume fallbacks
            pool: true,
            maxConnections: 3,
            maxMessages: 50,
            connectionTimeout: 10000,
            socketTimeout: 10000,
        });

        console.log('📧 [V2] Verifying Gmail transporter connection...');
        await withTimeout(
            new Promise((resolve, reject) => {
                transporter.verify((error, success) => {
                    if (error) {
                        console.error('📧 [V2] Gmail transporter verification failed:', error);
                        reject(error);
                    } else {
                        console.log('📧 [V2] Gmail transporter verification successful');
                        resolve(success);
                    }
                });
            }),
            5000,
            'Gmail transporter verify'
        );

        const sendPromise = transporter.sendMail({
            from: process.env.EMAIL_FROM || '"DineInGo 🦖" <sec.dinelngo.team@gmail.com>',
            to,
            subject,
            html,
            headers: {
                'X-Priority': '1', // High priority for fallback
                'X-Mailer': 'DineInGo Early Access v1.2',
            },
            text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        });

        console.log('⏳ [V2] Sending email via Gmail...');
        const info = await withTimeout(sendPromise, 6000, 'Gmail SMTP send');
        console.log('✅ [V2] Gmail SMTP Success:', { messageId: info.messageId, to });
        return true;
    } catch (smtpError: any) {
        console.error('❌ [V2] Gmail SMTP Failed:', {
            message: smtpError?.message,
            code: smtpError?.code,
            to,
            stack: smtpError?.stack?.substring(0, 200)
        });
        console.warn('⚠️ Email delivery failed but signup completed successfully (non-critical)');
        return false; // Not a critical error
    }
}
