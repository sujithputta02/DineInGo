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
            padding: 'clamp(30px, 5vw, 50px)',
            backgroundColor: '#f0fdf4',
            borderRadius: '16px',
            marginBottom: '32px',
            border: '2px solid #10b981',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 'clamp(3rem, 8vw, 4rem)', marginBottom: '16px' }}>
              📧
            </div>
            <h3 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', fontWeight: '700', color: '#047857', marginBottom: '16px' }}>
              Email Support
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)' }}>
              <a href="mailto:sec.dinelngo.team@gmail.com" style={{ color: '#047857', fontWeight: '700', textDecoration: 'none', borderBottom: '2px solid #10b981' }}>
                sec.dinelngo.team@gmail.com
              </a>
            </p>
            <p style={{ margin: 0, fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#6b7280' }}>
              We typically respond within 24 hours
            </p>
          </div>

          <div style={{
            padding: 'clamp(20px, 4vw, 30px)',
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
              � What to Include in Your Email
            </h3>
            <div style={{ textAlign: 'left', maxWidth: '600px', margin: '20px auto 0' }}>
              <ul style={{ 
                fontSize: 'clamp(0.9rem, 2vw, 1rem)', 
                lineHeight: '1.8',
                color: '#6b7280',
                paddingLeft: '24px'
              }}>
                <li>Your registered email address or phone number</li>
                <li>Reservation/Booking ID (if applicable)</li>
                <li>Detailed description of your issue</li>
                <li>Screenshots (if relevant)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupportPage;
