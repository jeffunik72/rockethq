'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', quote_id: '', due_date: '', status: 'New', payment_status: 'Unpaid', total: '', notes: '' });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchOrders(); fetchQuotes(); fetchCustomers(); }
    });
  }, []);

  
  async function sendInvoice(order) {
    const { data: cust } = await supabase.from('customers').select('*').eq('id', order.customer_id).single();
    if (!cust || !cust.email) { alert('No email for customer'); return; }
    const { data: invoice } = await supabase.from('invoices').select('*').eq('customer_id', order.customer_id).order('created_at', { ascending: false }).limit(1).single();
    if (!invoice) { alert('No invoice found'); return; }
    const res = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice, customer: cust, order }),
    });
    const result = await res.json();
    if (result.success) { alert('Invoice sent to ' + cust.email); }
    else { alert('Error sending invoice'); }
  }

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, company), quotes(id)')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  }

  async function fetchQuotes() {
    const { data } = await supabase
      .from('quotes')
      .select('id, total, customers(name)')
      .eq('status', 'Accepted');
    if (data) setQuotes(data);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, company');
    if (data) setCustomers(data);
  }

  async function saveOrder() {
    const { error } = await supabase.from('orders').insert([{
      customer_id: form.customer_id,
      quote_id: form.quote_id || null,
      due_date: form.due_date || null,
      status: form.status,
      payment_status: form.payment_status,
      total: parseFloat(form.total) || 0,
      notes: form.notes,
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ customer_id: '', quote_id: '', due_date: '', status: 'New', payment_status: 'Unpaid', total: '', notes: '' });
    fetchOrders();
  }

  async function updateOrderStatus(id, status) {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchOrders();
  }

  async function updatePaymentStatus(id, payment_status) {
    await supabase.from('orders').update({ payment_status }).eq('id', id);
    fetchOrders();
  }

  const statusColors = {
    'New': { bg: '#dbeafe', color: '#1d4ed8' },
    'In Production': { bg: '#fef3c7', color: '#b45309' },
    'Ready': { bg: '#dcfce7', color: '#15803d' },
    'Delivered': { bg: '#ede9fe', color: '#5b21b6' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
  };

  const paymentColors = {
    'Unpaid': { bg: '#fee2e2', color: '#b91c1c' },
    'Partial': { bg: '#fef3c7', color: '#b45309' },
    'Paid': { bg: '#dcfce7', color: '#15803d' },
  };

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const unpaid = orders.filter(o => o.payment_status === 'Unpaid').reduce((s, o) => s + (o.total || 0), 0);
  const inProduction = orders.filter(o => o.status === 'In Production').length;
  const paid = orders.filter(o => o.payment_status === 'Paid').reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Orders</h1>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ New Order</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Orders', value: orders.length, note: 'All time' },
              { label: 'Total Revenue', value: '$' + totalRevenue.toFixed(2), note: 'All orders' },
              { label: 'Outstanding', value: '$' + unpaid.toFixed(2), note: 'Unpaid orders', red: unpaid > 0 },
              { label: 'Paid Revenue', value: '$' + paid.toFixed(2), note: 'Collected', green: true },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.red ? '#dc2626' : s.green ? '#16a34a' : '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* In Production Banner */}
          {inProduction > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⏱ <strong>{inProduction} order{inProduction > 1 ? 's' : ''} currently in production</strong>
            </div>
          )}

          {/* Table */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Order #', 'Customer', 'Due Date', 'Total', 'Status', 'Payment', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>}
                {!loading && orders.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No orders yet. Create your first one!</td></tr>
                )}
                {orders.map((o, i) => {
                  const sc = statusColors[o.status] || statusColors['New'];
                  const pc = paymentColors[o.payment_status] || paymentColors['Unpaid'];
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                        ORD-{String(o.order_number || i + 1).padStart(4, '0')}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600 }}>{o.customers?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{o.customers?.company}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{o.due_date || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600 }}>${(o.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <select
                          value={o.status}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          style={{ background: sc.bg, color: sc.color, border: 'none', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <select
                          value={o.payment_status}
                          onChange={e => updatePaymentStatus(o.id, e.target.value)}
                          style={{ background: pc.bg, color: pc.color, border: 'none', borderRadius: '100px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {Object.keys(paymentColors).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => router.push('/orders/' + o.id)} style={{ padding: '4px 10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                          <button onClick={() => sendInvoice(o)} style={{ padding: '4px 10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Send Invoice</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* NEW ORDER MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>New Order</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer *</label>
                <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ' — ' + c.company : ''}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Linked Quote (optional)</label>
                <select value={form.quote_id} onChange={e => setForm({ ...form, quote_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                  <option value="">No linked quote</option>
                  {quotes.map((q, i) => <option key={q.id} value={q.id}>Q-{String(q.quote_number || i + 1).padStart(4, '0')} — {q.customers?.name} — ${q.total}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Total ($)</label>
                  <input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['New', 'In Production', 'Ready', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Payment Status</label>
                  <select value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['Unpaid', 'Partial', 'Paid'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Order notes..." rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>

            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveOrder} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
