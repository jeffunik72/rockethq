'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ customer_id: '', due_date: '', notes: '', status: 'New Quote' });
  const [items, setItems] = useState([{ description: '', category: '', quantity: 1, unit_price: 0, total: 0 }]);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchQuotes(); fetchCustomers(); }
    });
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const { data } = await supabase.from('quotes').select('*, customers(name, company)').order('created_at', { ascending: false });
    if (data) setQuotes(data);
    setLoading(false);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, company');
    if (data) setCustomers(data);
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { description: '', category: '', quantity: 1, unit_price: 0, total: 0 }]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function getTotal() {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }

  async function saveQuote() {
    const total = getTotal();
    const { data: quote, error } = await supabase.from('quotes').insert([{ ...form, total }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    const quoteItems = items.map(item => ({ ...item, quote_id: quote.id }));
    await supabase.from('quote_items').insert(quoteItems);
    setShowModal(false);
    setForm({ customer_id: '', due_date: '', notes: '', status: 'New Quote' });
    setItems([{ description: '', category: '', quantity: 1, unit_price: 0, total: 0 }]);
    fetchQuotes();
  }

  const statusColors = {
    'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
    'Sent': { bg: '#fef3c7', color: '#b45309' },
    'Accepted': { bg: '#dcfce7', color: '#15803d' },
    'Ordered': { bg: '#ede9fe', color: '#5b21b6' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
  };

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Quotes</h1>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ New Quote</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Quotes', value: quotes.length },
              { label: 'Total Value', value: '$' + quotes.reduce((s, q) => s + (q.total || 0), 0).toFixed(2) },
              { label: 'Accepted', value: quotes.filter(q => q.status === 'Accepted').length },
              { label: 'Pending', value: quotes.filter(q => q.status === 'New Quote' || q.status === 'Sent').length },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Quote #', 'Customer', 'Due Date', 'Total', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>}
                {!loading && quotes.length === 0 && <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No quotes yet. Create your first one!</td></tr>}
                {quotes.map((q, i) => {
                  const sc = statusColors[q.status] || statusColors['New Quote'];
                  return (
                    <tr key={q.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>Q-{String(i + 1).padStart(4, '0')}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600 }}>{q.customers?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{q.customers?.company}</div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{q.due_date || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600 }}>${(q.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{q.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>New Quote</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ' — ' + c.company : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                  {['New Quote', 'Sent', 'Accepted', 'Ordered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Line Items</label>
                  <button onClick={addItem} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Item</button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Description', 'Category', 'Qty', 'Unit Price', 'Total', ''].map(h => (
                        <th key={h} style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#6b7280', border: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}><input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" style={{ width: '100%', border: 'none', padding: '4px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} /></td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px' }}><input value={item.category} onChange={e => updateItem(i, 'category', e.target.value)} placeholder="e.g. T-Shirts" style={{ width: '100%', border: 'none', padding: '4px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} /></td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px', width: '60px' }}><input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} style={{ width: '100%', border: 'none', padding: '4px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} /></td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px', width: '80px' }}><input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', border: 'none', padding: '4px', fontSize: '12px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} /></td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px', width: '80px', textAlign: 'center', fontWeight: 600 }}>${item.total.toFixed(2)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '4px', width: '30px', textAlign: 'center' }}><span onClick={() => removeItem(i)} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>×</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '14px', fontWeight: 700 }}>Total: ${getTotal().toFixed(2)}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Customer notes..." rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveQuote} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Quote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
