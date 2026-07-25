import React from 'react';
import { useNavigate } from 'react-router-dom';

const ContactSupportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: 'clamp(20px, 5vw, 40px) clamp(5%, 5vw, 8%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: 'clamp(30px, 6vw, 60px)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#047857',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px'
          }}
        >
          ← Back to Home
        </button>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: '900',
          color: '#111827',
          marginBottom: '16px'
        }}>
          Contact Support
        </h1>

        <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
          We're here to help! Reach out to us through any of the following channels.
        </p>

        <div style={{ lineHeight: '1.8', color: '#374151' }}>
          <div style={{
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #10b981'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#047857', marginBottom: '12px' }}>
              📧 Email Support
            </h3>
            <p style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              <a href="mailto:support@dineingo.com" style={{ color: '#047857', fontWeight: '600' }}>
                support@dineingo.com
              </a>
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: '#6b7280' }}>
              Response time: Within 24 hours
            </p>
          </div>

          <div style={{
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#eff6ff',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #3b82f6'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#1e40af', marginBottom: '12px' }}>
              📞 Phone Support
            </h3>
            <p style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              <a href="tel:+911800DINEINGO" style={{ color: '#1e40af', fontWeight: '600' }}>
                +91 1800-DINEINGO
              </a>
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)', color: '#6b7280' }}>
              Available: Monday - Friday, 9 AM - 6 PM IST
            </p>
          </div>

          <div style={{
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#fef3c7',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #f59e0b'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#92400e', marginBottom: '12px' }}>
              💬 Live Chat
            </h3>
            <p style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              Chat with our support team in real-time through the app
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: '16px',
                backgroundColor: '#d97706',
                color: 'white',
                border: 'none',
                padding: 'clamp(10px, 2vw, 12px) clamp(20px, 4vw, 24px)',
                borderRadius: '8px',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Open Live Chat
            </button>
          </div>

          <div style={{
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#f5f5f5',
            borderRadius: '12px',
            border: '1px solid #d4d4d4'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>
              📍 Office Address
            </h3>
            <p style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1rem)', lineHeight: '1.6' }}>
              DineInGo Technologies Pvt. Ltd.<br />
              123 Business Park, Cyber City<br />
              Bangalore, Karnataka 560001<br />
              India
            </p>
          </div>

          <div style={{
            marginTop: '40px',
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
              Need Immediate Assistance?
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              For urgent issues with your reservations, please call us directly or use the live chat feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupportPage;
