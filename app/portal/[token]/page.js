'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { use } from 'react';

export default function CustomerPortal({ params }) {
  const { token } = use(params);
  const [customer, setCustomer] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    fetchCustomerData();
  }, [token]);

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

    const [{ data: quotesData }, { data: ordersData }] = await Promise.all([
      supabase.from('quotes').select('*, quote_items(*)').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
    ]);

    setQuotes(quotesData || []);
    setOrders(ordersData || []);
    setLoading(false);
  }

  async function handlePayment(order, index) {
    setPaying(order.id);
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: order.total,
        customerName: customer.name,
        customerEmail: customer.email,
        orderId: `ORD-${String(index + 1).padStart(4, '0')}`,
        description: `Blue Rocket Order ORD-${String(index + 1).padStart(4, '0')}`,
      }),
    });
    const { url, error } = await res.json();
    if (error) { alert('Payment error: ' + error); setPaying(null); return; }
    window.location.href = url;
  }

  const statusColors = {
    'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
    'Sent': { bg: '#fef3c7', color: '#b45309' },
    'Accepted': { bg: '#dcfce7', color: '#15803d' },
    'Ordered': { bg: '#ede9fe', color: '#5b21b6' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
    'New': { bg: '#dbeafe', color: '#1d4ed8' },
    'In Production': { bg: '#fef3c7', color: '#b45309' },
    'Ready': { bg: '#dcfce7', color: '#15803d' },
    'Delivered': { bg: '#ede9fe', color: '#5b21b6' },
  };

  const paymentColors = {
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
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
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Welcome back, {customer.name.split(' ')[0]}! 👋</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Here's an overview of your quotes and orders with Blue Rocket.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Total Orders', value: orders.length, icon: '📋' },
            { label: 'Active Quotes', value: quotes.filter(q => q.status === 'New Quote' || q.status === 'Sent').length, icon: '📄' },
            { label: 'Outstanding', value: '$' + orders.filter(o => o.payment_status === 'Unpaid').reduce((s, o) => s + (o.total || 0), 0).toFixed(2), icon: '💲', red: true },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: '#f3f4f6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.red ? '#dc2626' : '#111827' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
          {[
            { id: 'orders', label: 'Orders', count: orders.length },
            { id: 'quotes', label: 'Quotes', count: quotes.length },
          ].map(tab => (
            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === tab.id ? '#2563eb' : '#6b7280', borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab.label}
              <span style={{ background: activeTab === tab.id ? '#dbeafe' : '#f3f4f6', color: activeTab === tab.id ? '#1d4ed8' : '#6b7280', padding: '1px 7px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{tab.count}</span>
            </div>
          ))}
        </div>

        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No orders yet.</p>
              </div>
            ) : orders.map((order, i) => {
              const sc = statusColors[order.status] || statusColors['New'];
              const pc = paymentColors[order.payment_status] || paymentColors['Unpaid'];
              return (
                <div key={order.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>ORD-{String(i + 1).padStart(4, '0')}</div>
                      {order.due_date && <div style={{ fontSize: '13px', color: '#6b7280' }}>Due: {order.due_date}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>${(order.total || 0).toFixed(2)}</div>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{order.status}</span>
                        <span style={{ background: pc.bg, color: pc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{order.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '16px' }}>
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
                      <div style={{ height: '100%', background: '#2563eb', borderRadius: '100px', width: order.status === 'New' ? '8%' : order.status === 'In Production' ? '40%' : order.status === 'Ready' ? '75%' : '100%', transition: 'width .5s' }} />
                    </div>
                  </div>

                  {order.notes && (
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#374151', marginBottom: '12px' }}>
                      📝 {order.notes}
                    </div>
                  )}

                  {/* Pay Now Button */}
                  {order.payment_status === 'Unpaid' && order.total > 0 && (
                    <div style={{ paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
                      <button
                        onClick={() => handlePayment(order, i)}
                        disabled={paying === order.id}
                        style={{ width: '100%', padding: '12px', background: paying === order.id ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: paying === order.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                      >
                        {paying === order.id ? 'Redirecting to payment...' : `💳 Pay $${(order.total || 0).toFixed(2)} Now`}
                      </button>
                    </div>
                  )}

                  {order.payment_status === 'Paid' && (
                    <div style={{ paddingTop: '14px', borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                      ✓ Payment received — Thank you!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            {quotes.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📄</div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No quotes yet.</p>
              </div>
            ) : quotes.map((quote, i) => {
              const sc = statusColors[quote.status] || statusColors['New Quote'];
              return (
                <div key={quote.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
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
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>ITEMS</div>
                      {quote.quote_items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f9fafb' }}>
                          <span>{item.description} {item.category && `(${item.category})`} × {item.quantity}</span>
                          <span style={{ fontWeight: 600 }}>${(item.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {quote.notes && (
                    <div style={{ background: '#f8f9fb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#374151', marginTop: '12px' }}>
                      📝 {quote.notes}
                    </div>
                  )}
                  {(quote.status === 'New Quote' || quote.status === 'Sent') && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
                      <a href="mailto:hello@rockethq.io?subject=Accepting Quote" style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>✓ Accept Quote</a>
                      <a href="mailto:hello@rockethq.io?subject=Question about Quote" style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #e5e7eb', color: '#374151', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>💬 Ask a Question</a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', padding: '20px', fontSize: '13px', color: '#9ca3af' }}>
          <p style={{ margin: '0 0 4px' }}>Questions? <a href="mailto:hello@rockethq.io" style={{ color: '#2563eb' }}>hello@rockethq.io</a></p>
          <p style={{ margin: 0 }}>Powered by <strong style={{ color: '#374151' }}>RocketHQ</strong></p>
        </div>
      </div>
    </div>
  );
}
