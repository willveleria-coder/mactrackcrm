export default function PaymentSuccess() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f3f4f6',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '32px'
        }}>
          ✓
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 12px'
        }}>
          Payment Successful!
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: '16px',
          margin: '0 0 24px'
        }}>
          Thank you for your payment. Your delivery has been confirmed.
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <a 
            href="https://macwithavan.com" 
            style={{
              display: 'block',
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: 'white',
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Visit Homepage
          </a>
          <a 
            href="https://mactrackcrm.vercel.app" 
            style={{
              display: 'block',
              background: '#f3f4f6',
              color: '#374151',
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #e5e7eb'
            }}
          >
            Go to Portal
          </a>
        </div>
        
        <p style={{
          color: '#9ca3af',
          fontSize: '14px',
          margin: '24px 0 0'
        }}>
          Mac With A Van
        </p>
      </div>
    </div>
  );
}