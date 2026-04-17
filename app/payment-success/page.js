'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const portalToken = searchParams.get('portal_token');
  const invoiceId = searchParams.get('invoice_id');
  const amount = parseFloat(searchParams.get('amount') || '0');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    async function updateInvoice() {
      if (!invoiceId || !amount) return;
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (!invoice) return;
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newAmountDue = Math.max(0, invoice.amount_total - newAmountPaid);
      const newStatus = newAmountDue === 0 ? 'Paid' : 'Partial';
      await supabase.from('invoices').update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
      }).eq('id', invoiceId);
      if (newStatus === 'Paid') {
        await supabase.from('orders')
          .update({ status: 'New', payment_status: 'Paid' })
          .eq('customer_id', invoice.customer_id)
          .eq('status', 'Awaiting Payment');
      } else {
        await supabase.from('orders')
          .update({ payment_status: 'Partial' })
          .eq('customer_id', invoice.customer_id)
          .eq('status', 'Awaiting Payment');
      }
    }
    updateInvoice();
  }, [invoiceId, amount]);

  useEffect(() => {
    if (!portalToken) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/portal/' + portalToken;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [portalToken]);

  const circumference = 2 * Math.PI * 28;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '480px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>Payment Received!</h1>
        <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
          Thank you for your payment of <strong>${amount.toFixed(2)}</strong>. We will get started on your order right away.
        </p>
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Payment confirmed</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>You will receive a confirmation email shortly</div>
        </div>
        {portalToken && (
          <div>
            <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 16px' }}>
              <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - countdown / 5)}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>
                {countdown}
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Redirecting to your portal in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
            
             < a href={'/portal/' + portalToken}
              style={{ display: 'inline-block', background: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}
            >
              Return to Portal Now
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
