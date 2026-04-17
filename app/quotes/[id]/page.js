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
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
    if (!itemsData || itemsData.length === 0) setEditMode(true);
    setLoading(false);
  }

  function addItem() {
    setItems([...items, { description: '', category: '', quantity: 1, unit_price: 0, total: 0 }]);
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = parseFloat(updated[index].quantity) * parseFloat(updated[index].unit_price);
    }
    setItems(updated);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function getTotal() {
    return items.reduce((s, i) => s + (i.total || 0), 0);
  }

  async function saveItems() {
    setSaving(true);
    const total = getTotal();
    await supabase.from('quote_items').delete().eq('quote_id', id);
    if (items.length > 0) {
      const newItems = items.map(item => ({
        quote_id: id,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));
      await supabase.from('quote_items').insert(newItems);
    }
    await supabase.from('quotes').update({ total }).eq('id', id);
    setQuote({ ...quote, total });
    setSaving(false);
    setEditMode(false);
  }

  async function updateStatus(status) {
    await supabase.from('quotes').update({ status }).eq('id', id);
    setQuote({ ...quote, status });
  }

  async function sendQuote() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    setSending(true);
    const res = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: { ...quote, quote_number: `Q-${id.slice(0, 8).toUpperCase()}` },
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
  const isEditable = quote.status === 'New Quote';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button onClick={() => router.push('/quotes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
              ← Back to Quotes
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isEditable && !editMode && (
                <button onClick={() => setEditMode(true)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  ✎ Edit Items
                </button>
              )}
              {editMode && (
                <button
                  onClick={saveItems}
                  disabled={saving}
                  style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
                >
                  {saving ? 'Saving...' : '💾 Save Quote'}
                </button>
              )}
              <button
                onClick={sendQuote}
                disabled={sending || items.length === 0}
                style={{ padding: '8px 16px', background: sending || items.length === 0 ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
              >
                {sending ? 'Sending...' : '✉ Send to Customer'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

            {/* Main */}
            <div>
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Quote Detail</h1>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>Created {new Date(quote.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ background: sc.bg, color: sc.color, padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 700 }}>{quote.status}</span>
                </div>

                {/* Customer */}
                {customer && (
                  <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{customer.name}</div>
                    {customer.company && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '2px' }}>{customer.company}</div>}
                    {customer.email && <div style={{ fontSize: '13px', color: '#2563eb' }}>{customer.email}</div>}
                    {customer.phone && <div style={{ fontSize: '13px', color: '#6b7280' }}>{customer.phone}</div>}
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Line Items</div>
                    {editMode && (
                      <button onClick={addItem} style={{ padding: '5px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Item</button>
                    )}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fb' }}>
                        {['Description', 'Category', 'Qty', 'Unit Price', 'Total', editMode ? '' : null].filter(Boolean).map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', border: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                            {editMode ? 'Click "+ Add Item" to start building your quote' : 'No line items yet'}
                          </td>
                        </tr>
                      )}
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #e5e7eb', padding: editMode ? '4px' : '10px 12px', fontSize: '13px' }}>
                            {editMode ? (
                              <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" style={{ width: '100%', border: 'none', padding: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                            ) : item.description}
                          </td>
                          <td style={{ border: '1px solid #e5e7eb', padding: editMode ? '4px' : '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                            {editMode ? (
                              <input value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} placeholder="e.g. T-Shirts" style={{ width: '100%', border: 'none', padding: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                            ) : item.category}
                          </td>
                          <td style={{ border: '1px solid #e5e7eb', padding: editMode ? '4px' : '10px 12px', fontSize: '13px', textAlign: 'center', width: '70px' }}>
                            {editMode ? (
                              <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} style={{ width: '100%', border: 'none', padding: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                            ) : item.quantity}
                          </td>
                          <td style={{ border: '1px solid #e5e7eb', padding: editMode ? '4px' : '10px 12px', fontSize: '13px', textAlign: 'right', width: '100px' }}>
                            {editMode ? (
                              <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', border: 'none', padding: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                            ) : '$' + parseFloat(item.unit_price).toFixed(2)}
                          </td>
                          <td style={{ border: '1px solid #e5e7eb', padding: '10px 12px', fontSize: '13px', textAlign: 'right', fontWeight: 600, width: '90px' }}>
                            ${(item.total || 0).toFixed(2)}
                          </td>
                          {editMode && (
                            <td style={{ border: '1px solid #e5e7eb', padding: '4px', width: '30px', textAlign: 'center' }}>
                              <span onClick={() => removeItem(idx)} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '18px' }}>×</span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ background: '#111827', color: 'white', borderRadius: '8px', padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Quote Total</div>
                      <div style={{ fontSize: '28px', fontWeight: 700 }}>${editMode ? getTotal().toFixed(2) : (quote.total || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {quote.notes && (
                  <div style={{ marginTop: '20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px', textTransform: 'uppercase' }}>Notes</div>
                    <div style={{ fontSize: '13px', color: '#78350f' }}>{quote.notes}</div>
                  </div>
                )}

                {/* Rejection */}
                {quote.rejection_reason && (
                  <div style={{ marginTop: '16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', marginBottom: '6px', textTransform: 'uppercase' }}>Rejection Reason</div>
                    <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{quote.rejection_reason}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div>
              {/* Status */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Update Status</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {['New Quote', 'Sent', 'Accepted', 'Ordered', 'Cancelled'].map(s => {
                    const c = statusColors[s] || statusColors['New Quote'];
                    return (
                      <button key={s} onClick={() => updateStatus(s)} style={{ padding: '8px 12px', background: quote.status === s ? c.bg : '#f9fafb', color: quote.status === s ? c.color : '#6b7280', border: `1px solid ${quote.status === s ? c.color : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', fontWeight: quote.status === s ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        {quote.status === s ? '● ' : '○ '}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Details</div>
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

              {/* Portal Link */}
              {customer?.portal_token && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase' }}>Customer Portal</div>
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
