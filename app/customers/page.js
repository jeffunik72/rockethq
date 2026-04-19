'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', customer_type: 'Retail', customer_tier: 'Standard' });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchCustomers(); }
    });
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  }

  async function createCustomer() {
    if (!form.name) { alert('Name is required'); return; }
    const token = crypto.randomUUID();
    const { data, error } = await supabase.from('customers').insert([{ ...form, portal_token: token, portal_enabled: true }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ name: '', company: '', email: '', phone: '', customer_type: 'Retail', customer_tier: 'Standard' });
    router.push('/customers/' + data.id);
  }

  const filtered = customers.filter(c =>
    !search ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  function getInitials(name) {
    return (name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#16a34a', '#0891b2'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  if (checking) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Customers</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{customers.length} total customers</div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              + New Customer
            </button>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, company or email..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Customer', 'Company', 'Email', 'Phone', 'Type', 'Tier'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No customers found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} onClick={() => router.push('/customers/' + c.id)} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getAvatarColor(c.company || c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {getInitials(c.company || c.name)}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{c.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{c.company || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#2563eb' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.customer_type && <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{c.customer_type}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.customer_tier && <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{c.customer_tier}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>New Customer</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Full Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Smith" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Acme Co." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(615) 000-0000" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer Type</label>
                  <select value={form.customer_type} onChange={e => setForm({...form, customer_type: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['Retail', 'Wholesale', 'Corporate', 'Non-Profit', 'Government', 'Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer Tier</label>
                  <select value={form.customer_tier} onChange={e => setForm({...form, customer_tier: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['Standard', 'Silver', 'Gold', 'Platinum', 'VIP'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={createCustomer} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Create Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
