export default function PaymentCancelled() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>😕</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>Payment Cancelled</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>No worries — your payment was not processed. Please reach out if you need help.</p>
        <a href="mailto:hello@rockethq.io" style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Contact Us →</a>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px' }}>Powered by <strong style={{ color: '#374151' }}>RocketHQ</strong></p>
      </div>
    </div>
  );
}
