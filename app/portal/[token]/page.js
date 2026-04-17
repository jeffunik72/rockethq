'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { use } from 'react';

export default function CustomerPortal({ params }) {
  const { token } = use(params);
  const [customer, setCustomer] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [paying, setPaying] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentType, setPaymentType] = useState('full');
  const [customAmount, setCustomAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchCustomerData(); }, [token]);

  async function fetchCustomerData() {
    setLoading(true);
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('portal_token', token)
      .eq('portal_enabled', true)
      .single();

    if (!customerData) { setNotFound(true); setLoading(false); return; }
    setCustomer(customerData);

    const [{ data: quotesData }, { data: ordersData }, { data: invoicesData }] = await Promise.all([
      supabase.from('quotes').select('*, quote_items(*)').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
    ]);

    setQuotes(quotesData || []);
    setOrders(ordersData || []);
    setInvoices(invoicesData || []);
    setLoading(false);
  }

  async function acceptQuote(quote) {
    setActionLoading(quote.id);
    try {
      // 1. Update quote status
      await supabase.from('quotes').update({
        status: 'Accepted',
        approved_at: new Date().toISOString(),
      }).eq('id', quote.id);

      // 2. Create invoice
      const { data: invoice } = await supabase.from('invoices').insert([{
        quote_id: quote.id,
        customer_id: customer.id,
        amount_total: quote.total,
        amount_paid: 0,
        amount_due: quote.total,
        status: 'Unpaid',
      }]).select().single();

      // 3. Create order (locked until payment)
      await supabase.from('orders').insert([{
        customer_id: customer.id,
        quote_id: quote.id,
        total: quote.total,
        status: 'Awaiting Payment',
        payment_status: 'Unpaid',
        notes: quote.notes || '',
      }]);

      // 4. Refresh data
      await fetchCustomerData();

      // 5. Show payment modal
      setSelectedInvoice(invoice);
      setShowPaymentModal(true);
      setActiveTab('invoices');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(null);
  }

  async function rejectQuote() {
    if (!rejectionReason) { alert('Please provide a reason'); return; }
    setActionLoading(selectedQuote.id);
    await supabase.from('quotes').update({
      status: 'Cancelled',
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    }).eq('id', selectedQuote.id);
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedQuote(null);
    await fetchCustomerData();
    setActionLoading(null);
  }

  async function handlePayment(invoice, amount, type) {
    setPaying(invoice.id);
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        customerName: customer.name,
        customerEmail: customer.email,
        orderId: invoice.id,
        description: type === 'deposit' ? '50% Deposit — Blue Rocket' : type === 'custom' ? 'Custom Payment — Blue Rocket' : 'Full Payment — Blue Rocket',
      }),
    });
    const { url, error } = await res.json();
    if (error) { alert('Payment error: ' + error); setPaying(null); return; }
    window.location.href = url;
  }

  function getPaymentAmount() {
    if (!selectedInvoice) return 0;
    if (paymentType === 'full') return selectedInvoice.amount_due;
    if (paymentType === 'deposit') return Math.round(selectedInvoice.amount_due * 0.5 * 100) / 100;
    if (paymentType === 'custom') return parseFloat(customAmount) || 0;
    return 0;
  }

  const statusColors = {
    'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
    'Sent': { bg: '#fef3c7', color: '#b45309' },
    'Accepted': { bg: '#dcfce7', color: '#15803d' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
    'New': { bg: '#dbeafe', color: '#1d4ed8' },
    'Awaiting Payment': { bg: '#fef3c7', color: '#b45309' },
    'In Production': { bg: '#ede9fe', color: '#5b21b6' },
    'Ready': { bg: '#dcfce7', color: '#15803d' },
    'Delivered': { bg: '#f3f4f6', color: '#4b5563' },
    'Unpaid': { bg: '#fee2e2', color: '#b91c1c' },
    'Partial': { bg: '#fef3c7', color: '#b45309' },
    'Paid': { bg: '#dcfce7', color: '#15803d' },
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading your portal...</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Portal Not Found</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>This link is invalid or has expired.</p>
        <a href="mailto:hello@rockethq.io" style={{ display: 'inline-block', marginTop: '16px', color: '#2563eb', fontSize: '14px', fontWeight: 600 }}>Contact Blue Rocket →</a>
      </div>
    </div>
  );

  const pendingQuotes = quotes.filter(q => q.status === 'New Quote' || q.status === 'Sent');
  const unpaidInvoices = invoices.filter(i => i.status === 'Unpaid' || i.status === 'Partial');

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#111827', padding: '0 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '24px' }}>🚀</div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>Blue Rocket</div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>Customer Portal</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{customer.name}</div>
            {customer.company && <div style={{ color: '#9ca3af', fontSize: '12px' }}>{customer.company}</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Alerts */}
        {pendingQuotes.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>📄</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>You have {pendingQuotes.length} quote{pendingQuotes.length > 1 ? 's' : ''} awaiting your review</div>
              <div style={{ fontSize: '13px', color: '#b45309', marginTop: '2px' }}>Please review and accept or reject below</div>
            </div>
            <button onClick={() => setActiveTab('quotes')} style={{ marginLeft: 'auto', padding: '8px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>
          </div>
        )}

        {unpaidInvoices.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>💳</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#b91c1c' }}>{unpaidInvoices.length} invoice{unpaidInvoices.length > 1 ? 's' : ''} outstanding</div>
              <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '2px' }}>Total due: ${unpaidInvoices.reduce((s, i) => s + (i.amount_due || 0), 0).toFixed(2)}</div>
            </div>
            <button onClick={() => setActiveTab('invoices')} style={{ marginLeft: 'auto', padding: '8px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Pay Now →</button>
          </div>
        )}

        {/* Welcome */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Welcome back, {customer.name.split(' ')[0]}! 👋</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Manage your quotes, orders and invoices with Blue Rocket.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Orders', value: orders.length, icon: '📋' },
            { label: 'Quotes', value: quotes.length, icon: '📄' },
            { label: 'Invoices', value: invoices.length, icon: '🧾' },
            { label: 'Balance Due', value: '$' + unpaidInvoices.reduce((s, i) => s + (i.amount_due || 0), 0).toFixed(2), icon: '💲', red: unpaidInvoices.length > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: s.red ? '#dc2626' : '#111827' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
          {[
            { id: 'orders', label: 'Orders', count: orders.length },
            { id: 'quotes', label: 'Quotes', count: quotes.length, alert: pendingQuotes.length },
            { id: 'invoices', label: 'Invoices', count: invoices.length, alert: unpaidInvoices.length },
          ].map(tab => (
            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === tab.id ? '#2563eb' : '#6b7280', borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab.label}
              <span style={{ background: activeTab === tab.id ? '#dbeafe' : '#f3f4f6', color: activeTab === tab.id ? '#1d4ed8' : '#6b7280', padding: '1px 7px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{tab.count}</span>
              {tab.alert > 0 && <span style={{ background: '#dc2626', color: 'white', padding: '1px 6px', borderRadius: '100px', fontSize: '10px', fontWeight: 700 }}>{tab.alert}</span>}
            </div>
          ))}
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No orders yet.</p>
              </div>
            ) : orders.map((order, i) => {
              const sc = statusColors[order.status] || statusColors['New'];
              return (
                <div key={order.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>ORD-{String(i + 1).padStart(4, '0')}</div>
                      {order.due_date && <div style={{ fontSize: '13px', color: '#6b7280' }}>Due: {order.due_date}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>${(order.total || 0).toFixed(2)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{order.status}</span>
                    </div>
                  </div>

                  {order.status === 'Awaiting Payment' ? (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>⏳ Awaiting Payment</div>
                      <div style={{ fontSize: '13px', color: '#b45309' }}>Your order will be released to production once payment is received</div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        {['New', 'In Production', 'Ready', 'Delivered'].map((stage, idx) => {
                          const stages = ['New', 'In Production', 'Ready', 'Delivered'];
                          const currentIdx = stages.indexOf(order.status);
                          const isPast = idx <= currentIdx;
                          return (
                            <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: isPast ? '#2563eb' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                {isPast && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                              </div>
                              <div style={{ fontSize: '10px', color: isPast ? '#2563eb' : '#9ca3af', fontWeight: isPast ? 600 : 400, textAlign: 'center' }}>{stage}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '100px', margin: '0 10px', position: 'relative', top: '-28px' }}>
                        <div style={{ height: '100%', background: '#2563eb', borderRadius: '100px', width: order.status === 'New' ? '8%' : order.status === 'In Production' ? '40%' : order.status === 'Ready' ? '75%' : '100%' }} />
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#374151', marginTop: '8px' }}>
                      📝 {order.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* QUOTES TAB */}
        {activeTab === 'quotes' && (
          <div>
            {quotes.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No quotes yet.</p>
              </div>
            ) : quotes.map((quote, i) => {
              const sc = statusColors[quote.status] || statusColors['New Quote'];
              const isPending = quote.status === 'New Quote' || quote.status === 'Sent';
              return (
                <div key={quote.id} style={{ background: 'white', border: `1px solid ${isPending ? '#fde68a' : '#e5e7eb'}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>Q-{String(i + 1).padStart(4, '0')}</div>
                      {quote.due_date && <div style={{ fontSize: '13px', color: '#6b7280' }}>Valid until: {quote.due_date}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>${(quote.total || 0).toFixed(2)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{quote.status}</span>
                    </div>
                  </div>

                  {quote.quote_items && quote.quote_items.length > 0 && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>ITEMS</div>
                      {quote.quote_items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                          <span style={{ color: '#374151' }}>{item.description} {item.category && `(${item.category})`} × {item.quantity}</span>
                          <span style={{ fontWeight: 600 }}>${(item.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '14px', fontWeight: 700 }}>
                        Total: ${(quote.total || 0).toFixed(2)}
                      </div>
                    </div>
                  )}

                  {quote.notes && (
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#374151', marginBottom: '14px' }}>
                      📝 {quote.notes}
                    </div>
                  )}

                  {quote.rejection_reason && (
                    <div style={{ background: '#fee2e2', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#b91c1c', marginBottom: '14px' }}>
                      ✗ Rejected: {quote.rejection_reason}
                    </div>
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => acceptQuote(quote)}
                        disabled={actionLoading === quote.id}
                        style={{ flex: 2, padding: '12px', background: actionLoading === quote.id ? '#86efac' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {actionLoading === quote.id ? 'Processing...' : '✓ Accept Quote'}
                      </button>
                      <button
                        onClick={() => { setSelectedQuote(quote); setShowRejectModal(true); }}
                        style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {quote.status === 'Accepted' && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                      ✓ Quote accepted — Invoice generated
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div>
            {invoices.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No invoices yet.</p>
              </div>
            ) : invoices.map((invoice, i) => {
              const sc = statusColors[invoice.status] || statusColors['Unpaid'];
              const isPaid = invoice.status === 'Paid';
              return (
                <div key={invoice.id} style={{ background: 'white', border: `1px solid ${!isPaid ? '#fecaca' : '#86efac'}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>INV-{String(i + 1).padStart(4, '0')}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>Created: {new Date(invoice.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>${(invoice.amount_total || 0).toFixed(2)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{invoice.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>${(invoice.amount_total || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Paid</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>${(invoice.amount_paid || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: invoice.amount_due > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Due</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: invoice.amount_due > 0 ? '#dc2626' : '#16a34a' }}>${(invoice.amount_due || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  {!isPaid && invoice.amount_due > 0 && (
                    <button
                      onClick={() => { setSelectedInvoice(invoice); setShowPaymentModal(true); }}
                      style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      💳 Pay Invoice
                    </button>
                  )}

                  {isPaid && (
                    <div style={{ textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                      ✓ Paid in full — Thank you!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', padding: '20px', fontSize: '13px', color: '#9ca3af' }}>
          <p style={{ margin: '0 0 4px' }}>Questions? <a href="mailto:hello@rockethq.io" style={{ color: '#2563eb' }}>hello@rockethq.io</a></p>
          <p style={{ margin: 0 }}>Powered by <strong style={{ color: '#374151' }}>RocketHQ</strong></p>
        </div>
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && selectedQuote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Why are you rejecting this quote?</h2>
              <span onClick={() => { setShowRejectModal(false); setSelectedQuote(null); setRejectionReason(''); }} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {['Price is too high', 'Timeline doesn\'t work', 'Going with someone else', 'Need to make changes', 'Project cancelled', 'Other'].map(reason => (
                  <button key={reason} onClick={() => setRejectionReason(reason)} style={{ padding: '10px 14px', background: rejectionReason === reason ? '#fee2e2' : '#f9fafb', border: '1px solid', borderColor: rejectionReason === reason ? '#fca5a5' : '#e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: rejectionReason === reason ? 600 : 400, cursor: 'pointer', textAlign: 'left', color: rejectionReason === reason ? '#b91c1c' : '#374151', fontFamily: 'inherit' }}>
                    {reason}
                  </button>
                ))}
              </div>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Add more details..." rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => { setShowRejectModal(false); setSelectedQuote(null); setRejectionReason(''); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={rejectQuote} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Submit Rejection</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Choose Payment Amount</h2>
              <span onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>

              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Invoice Total</span>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>${(selectedInvoice.amount_due || 0).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setPaymentType('full')}
                  style={{ padding: '16px', background: paymentType === 'full' ? '#eff6ff' : '#f9fafb', border: `2px solid ${paymentType === 'full' ? '#2563eb' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: paymentType === 'full' ? '#1d4ed8' : '#111827' }}>Pay in Full</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Complete payment — order goes straight to production</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: paymentType === 'full' ? '#2563eb' : '#111827' }}>${(selectedInvoice.amount_due || 0).toFixed(2)}</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentType('deposit')}
                  style={{ padding: '16px', background: paymentType === 'deposit' ? '#eff6ff' : '#f9fafb', border: `2px solid ${paymentType === 'deposit' ? '#2563eb' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: paymentType === 'deposit' ? '#1d4ed8' : '#111827' }}>50% Deposit</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Pay half now, balance due on completion</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: paymentType === 'deposit' ? '#2563eb' : '#111827' }}>${(selectedInvoice.amount_due * 0.5).toFixed(2)}</div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentType('custom')}
                  style={{ padding: '16px', background: paymentType === 'custom' ? '#eff6ff' : '#f9fafb', border: `2px solid ${paymentType === 'custom' ? '#2563eb' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s' }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700, color: paymentType === 'custom' ? '#1d4ed8' : '#111827', marginBottom: '8px' }}>Custom Amount</div>
                  {paymentType === 'custom' && (
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter amount..."
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                    />
                  )}
                </button>
              </div>

              <button
                onClick={() => handlePayment(selectedInvoice, getPaymentAmount(), paymentType)}
                disabled={paying === selectedInvoice.id || (paymentType === 'custom' && !customAmount)}
                style={{ width: '100%', padding: '14px', background: paying === selectedInvoice.id ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {paying === selectedInvoice.id ? 'Redirecting...' : `💳 Pay $${getPaymentAmount().toFixed(2)}`}
              </button>

              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
                🔒 Secured by Stripe — we never store your card details
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
