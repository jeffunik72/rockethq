'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const CATEGORIES = ['Materials', 'Shipping', 'Labor', 'Equipment', 'Overhead', 'Software', 'Marketing', 'Other'];

const categoryColors = {
  'Materials': { bg: '#dbeafe', color: '#1d4ed8' },
  'Shipping': { bg: '#fef3c7', color: '#b45309' },
  'Labor': { bg: '#dcfce7', color: '#15803d' },
  'Equipment': { bg: '#ede9fe', color: '#5b21b6' },
  'Overhead': { bg: '#fee2e2', color: '#b91c1c' },
  'Software': { bg: '#f3f4f6', color: '#4b5563' },
  'Marketing': { bg: '#fce7f3', color: '#9d174d' },
  'Other': { bg: '#f3f4f6', color: '#6b7280' },
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [form, setForm] = useState({
    description: '', category: 'Materials', amount: '',
    date: new Date().toISOString().split('T')[0],
    order_id: '', customer_id: '', vendor: '', notes: ''
  });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchExpenses(); fetchOrders(); fetchCustomers(); }
    });
  }, []);

  async function fetchExpenses() {
    setLoading(true);
    const { data } = await supabase
      .from('expenses')
      .select('*, orders(id), customers(name, company)')
      .order('date', { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('id, total, customers(name)');
    if (data) setOrders(data);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, company');
    if (data) setCustomers(data);
  }

  async function saveExpense() {
    const { error } = await supabase.from('expenses').insert([{
      ...form,
      amount: parseFloat(form.amount) || 0,
      order_id: form.order_id || null,
      customer_id: form.customer_id || null,
      date: form.date || new Date().toISOString().split('T')[0],
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ description: '', category: 'Materials', amount: '', date: new Date().toISOString().split('T')[0], order_id: '', customer_id: '', vendor: '', notes: '' });
    fetchExpenses();
  }

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchExpenses();
  }

  const filtered = filterCategory === 'All' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const thisMonth = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7)));
  const thisMonthTotal = thisMonth.reduce((s, e) => s + (e.amount || 0), 0);

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.total > 0);

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Expenses</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Track costs and monitor profit margins</div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ Log Expense</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Expenses', value: '$' + totalExpenses.toFixed(2), note: 'All time', red: true },
              { label: 'This Month', value: '$' + thisMonthTotal.toFixed(2), note: new Date().toLocaleString('default', { month: 'long' }), red: thisMonthTotal > 0 },
              { label: 'Total Logged', value: expenses.length, note: 'All expenses' },
              { label: 'Avg Expense', value: expenses.length ? '$' + (totalExpenses / expenses.length).toFixed(2) : '$0', note: 'Per entry' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.red && s.value !== '$0.00' ? '#dc2626' : '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>

            {/* Category Breakdown */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>By Category</div>
              {byCategory.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No expenses yet</div>
              ) : (
                byCategory.sort((a, b) => b.total - a.total).map(c => {
                  const cc = categoryColors[c.cat] || categoryColors['Other'];
                  const pct = totalExpenses > 0 ? (c.total / totalExpenses * 100).toFixed(0) : 0;
                  return (
                    <div key={c.cat} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{c.cat}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>${c.total.toFixed(2)} ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: cc.color, borderRadius: '100px', transition: 'width .3s' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Filter + Table */}
            <div>
              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {['All', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    style={{ padding: '4px 12px', borderRadius: '100px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderColor: filterCategory === cat ? '#2563eb' : '#e5e7eb', background: filterCategory === cat ? '#2563eb' : 'white', color: filterCategory === cat ? 'white' : '#6b7280' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {['Date', 'Description', 'Category', 'Vendor', 'Linked To', 'Amount', ''].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>}
                    {!loading && filtered.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No expenses yet. Log your first one!</td></tr>
                    )}
                    {filtered.map(e => {
                      const cc = categoryColors[e.category] || categoryColors['Other'];
                      return (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>{e.date}</td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500 }}>{e.description}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ background: cc.bg, color: cc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{e.category}</span>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{e.vendor || '—'}</td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{e.customers?.name || '—'}</td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>-${(e.amount || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '16px', fontWeight: 700 }}>×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid #f3f4f6', fontSize: '13px', fontWeight: 700 }}>
                    Total: <span style={{ color: '#dc2626', marginLeft: '8px' }}>-${filtered.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Log Expense</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description *</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Thread from supplier" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Amount *</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Vendor</label>
                  <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. S&S Activewear" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Linked Customer</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">None</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Linked Order</label>
                  <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">None</option>
                    {orders.map((o, i) => <option key={o.id} value={o.id}>ORD-{String(i+1).padStart(4,'0')} — {o.customers?.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional details..." rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>

            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveExpense} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
