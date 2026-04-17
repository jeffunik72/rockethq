'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function QuoteDetailPage({ params }) {
  const { id } = use(params);
  const [quote, setQuote] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchQuote();
    });
  }, [id]);

  async function fetchQuote() {
    const { data: quoteData } = await supabase
      .from('quotes')
      .select('*, customers(*)')
      .eq('id', id)
      .single();

    if (!quoteData) { router.push('/quotes'); return; }
    setQuote(quoteData);
    setCustomer(quoteData.customers);

    const { data: itemsData } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id);

    setItems(itemsData || []);
    setLoading(false);
  }

  async function updateStatus(status) {
    await supabase.from('quotes').update({ status }).eq('id', id);
    setQuote({ ...quote, status });
  }

  async function sendQuote() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    setSending(true);
    const quoteIndex = 1;
    const res = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: { ...quote, quote_number: `Q-${String(quoteIndex).padStart(4, '0')}` },
        customer,
        items,
      }),
    });
    const result = await res.json();
    if (result.success) {
      await updateStatus('Sent');
      alert(`Quote sent to ${customer.email}!`);
    } else {
      alert('Error: ' + JSON.stringify(result.error));
    }
    setSending(false);
  }

  const statusColors = {
    'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
    'Sent': { bg: '#fef3c7', color: '#b45309' },
    'Accepted': { bg: '#dcfce7', color: '#15803d' },
    'Ordered': { bg: '#ede9fe', color: '#5b21b6' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const sc = statusColors[quote.status] || statusColors['New Quote'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          {/* Back + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button onClick={() => router.push('/quotes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
              ← Back to Quotes
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={sendQuote}
                disabled={sending}
                style={{ padding: '8px 16px', background: sending ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
              >
                {sending ? 'Sending...' : '✉ Send to Customer'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

            {/* Main Content */}
            <div>
              {/* Quote Header */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Quote Detail</h1>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Created {new Date(quote.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 700 }}>{quote.status}</span>
                </div>

                {/* Customer Info */}
                {customer && (
                  <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>CUSTOMER</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{customer.name}</div>
                    {customer.company && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{customer.company}</div>}
                    {customer.email && <div style={{ fontSize: '13px', color: '#2563eb' }}>{customer.email}</div>}
                    {customer.phone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{customer.phone}</div>}
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>LINE ITEMS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fb' }}>
                        {['Description', 'Category', 'Qty', 'Unit Price', 'Total'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', border: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No line items</td></tr>
                      )}
                      {items.map(item => (
                        <tr key={item.id}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px' }}>{item.description}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' }}>{item.category}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'right' }}>${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'right', fontWeight: 600 }}>${parseFloat(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <div style={{ background: '#111827', color: 'white', borderRadius: '8px', padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Total</div>
                      <div style={{ fontSize: '24px', fontWeight: 700 }}>${(quote.total || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {quote.notes && (
                  <div style={{ marginTop: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>NOTES</div>
                    <div style={{ fontSize: '13px', color: '#78350f' }}>{quote.notes}</div>
                  </div>
                )}

                {/* Rejection reason */}
                {quote.rejection_reason && (
                  <div style={{ marginTop: '16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', marginBottom: '6px' }}>REJECTION REASON</div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{quote.rejection_reason}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {/* Status */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>UPDATE STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {['New Quote', 'Sent', 'Accepted', 'Ordered', 'Cancelled'].map(s => {
                    const c = statusColors[s] || statusColors['New Quote'];
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        style={{ padding: '8px 12px', background: quote.status === s ? c.bg : '#f9fafb', color: quote.status === s ? c.color : '#6b7280', border: `1px solid ${quote.status === s ? c.color : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', fontWeight: quote.status === s ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                      >
                        {quote.status === s ? '● ' : '○ '}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>DETAILS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Due Date</span>
                    <span style={{ fontWeight: 500 }}>{quote.due_date || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Created</span>
                    <span style={{ fontWeight: 500 }}>{new Date(quote.created_at).toLocaleDateString()}</span>
                  </div>
                  {quote.approved_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Approved</span>
                      <span style={{ fontWeight: 500, color: '#16a34a' }}>{new Date(quote.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {quote.rejected_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Rejected</span>
                      <span style={{ fontWeight: 500, color: '#dc2626' }}>{new Date(quote.rejected_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Portal Link */}
              {customer?.portal_token && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' }}>CUSTOMER PORTAL</div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/${customer.portal_token}`); alert('Portal link copied!'); }}
                    style={{ width: '100%', padding: '8px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}
                  >
                    🔗 Copy Customer Portal Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
