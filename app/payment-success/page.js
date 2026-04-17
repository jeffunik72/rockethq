'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const portalToken = searchParams.get('portal_token');

  useEffect(() => {
    if (portalToken) {
      setTimeout(() => {
        window.location.href = `/portal/${portalToken}`;
      }, 3000);
    }
  }, [portalToken]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>Payment Received!</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>Thank you for your payment. We'll get started on your order right away.</p>
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>✓ Payment confirmed</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>You'll receive a confirmation email shortly</div>
        </div>
        {portalToken && (
          <div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Redirecting you back to your portal in 3 seconds...</p>
            
              href={`/portal/${portalToken}`}
              style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
            >
              Return to Portal →
            </a>
          </div>
        )}
        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>Powered by <strong style={{ color: '#374151' }}>RocketHQ</strong></p>
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
