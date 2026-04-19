'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [quote, setQuote] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchOrder();
    });
  }, [id]);

  async function fetchOrder() {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, customers(*)')
      .eq('id', id)
      .single();
    if (!orderData) { router.push('/orders'); return; }
    setOrder(orderData);
    setCustomer(orderData.customers);

    const [{ data: invoiceData }, { data: quoteData }, { data: settingsData }] = await Promise.all([
      supabase.from('invoices').select('*').eq('customer_id', orderData.customer_id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('quotes').select('*, quote_items(*)').eq('id', orderData.quote_id).single(),
      supabase.from('settings').select('*').single(),
    ]);

    setInvoice(invoiceData);
    setQuote(quoteData);
    setSettings(settingsData);
    setLoading(false);
  }

  async function updateStatus(status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrder({ ...order, status });
  }

  async function updatePaymentStatus(payment_status) {
    await supabase.from('orders').update({ payment_status }).eq('id', id);
    setOrder({ ...order, payment_status });
  }

  async function sendInvoice() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    if (!invoice) { alert('No invoice found for this order'); return; }
    setSending(true);
    const res = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice, customer, order }),
    });
    const result = await res.json();
    if (result.success) { alert('Invoice sent to ' + customer.email + '!'); }
    else { alert('Error sending invoice'); }
    setSending(false);
  }

  const statusColors = {
    'Awaiting Payment': { bg: '#fef3c7', color: '#b45309' },
    'New': { bg: '#dbeafe', color: '#1d4ed8' },
    'In Production': { bg: '#ede9fe', color: '#5b21b6' },
    'Ready': { bg: '#dcfce7', color: '#15803d' },
    'Delivered': { bg: '#f3f4f6', color: '#4b5563' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
  };

  const paymentColors = {
    'Unpaid': { bg: '#fee2e2', color: '#b91c1c' },
    'Partial': { bg: '#fef3c7', color: '#b45309' },
    'Paid': { bg: '#dcfce7', color: '#15803d' },
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const sc = statusColors[order.status] || statusColors['New'];
  const pc = paymentColors[order.payment_status] || paymentColors['Unpaid'];
  const prefix = settings?.order_prefix || 'ORD';
  const orderNum = prefix + '-' + String(order.order_number || '').padStart(4, '0');
  const invPrefix = settings?.invoice_prefix || 'INV';
  const invNum = invoice ? invPrefix + '-' + String(invoice.invoice_number || '').padStart(4, '0') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f8f9fb' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => router.push('/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                Back to Orders
              </button>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{orderNum}</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={sendInvoice}
                disabled={sending}
                style={{ padding: '8px 14px', background: sending ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
              >
                {sending ? 'Sending...' : 'Send Invoice'}
              </button>
              {quote && (
                <button
                  onClick={() => router.push('/quotes/' + quote.id)}
                  style={{ padding: '8px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
                >
                  View Quote
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>

            {/* Main */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Order Header */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Customer</div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{customer?.name}</div>
                    {customer?.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.company}</div>}
                    {customer?.email && <div style={{ fontSize: '12px', color: '#2563eb' }}>{customer.email}</div>}
                    {customer?.phone && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.phone}</div>}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Order #:</span>
                        <span style={{ fontWeight: 600 }}>{orderNum}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Created:</span>
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Due Date:</span>
                        <span>{order.due_date || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Total:</span>
                        <span style={{ fontWeight: 700 }}>${(order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Notes</div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>{order.notes || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Invoice Summary */}
              {invoice && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Invoice {invNum}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Total', value: '$' + (invoice.amount_total || 0).toFixed(2), color: '#111827' },
                      { label: 'Paid', value: '$' + (invoice.amount_paid || 0).toFixed(2), color: '#16a34a' },
                      { label: 'Balance Due', value: '$' + (invoice.amount_due || 0).toFixed(2), color: invoice.amount_due > 0 ? '#dc2626' : '#16a34a' },
                      { label: 'Status', value: invoice.status, color: invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Partial' ? '#b45309' : '#dc2626' },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quote Items */}
              {quote && quote.quote_items && quote.quote_items.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>Order Items</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fb' }}>
                        {['Description', 'Category', 'Qty', 'Unit Price', 'Total'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', border: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quote.quote_items.map(item => (
                        <tr key={item.id}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px' }}>{item.description}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' }}>{item.category}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'right' }}>${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e5e7eb', fontSize: '13px', textAlign: 'right', fontWeight: 600 }}>${parseFloat(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Order Status */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Order Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.keys(statusColors).map(s => {
                    const c = statusColors[s];
                    return (
                      <button key={s} onClick={() => updateStatus(s)} style={{ padding: '8px 12px', background: order.status === s ? c.bg : '#f9fafb', color: order.status === s ? c.color : '#6b7280', border: '1px solid', borderColor: order.status === s ? c.color : '#e5e7eb', borderRadius: '6px', fontSize: '13px', fontWeight: order.status === s ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        {order.status === s ? '● ' : '○ '}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment Status */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Payment Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.keys(paymentColors).map(s => {
                    const c = paymentColors[s];
                    return (
                      <button key={s} onClick={() => updatePaymentStatus(s)} style={{ padding: '8px 12px', background: order.payment_status === s ? c.bg : '#f9fafb', color: order.payment_status === s ? c.color : '#6b7280', border: '1px solid', borderColor: order.payment_status === s ? c.color : '#e5e7eb', borderRadius: '6px', fontSize: '13px', fontWeight: order.payment_status === s ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        {order.payment_status === s ? '● ' : '○ '}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Portal */}
              {customer?.portal_token && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Customer Portal</div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.origin + '/portal/' + customer.portal_token); alert('Portal link copied!'); }}
                    style={{ width: '100%', padding: '8px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}
                  >
                    Copy Portal Link
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
