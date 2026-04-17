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
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', city: '', state: '' });
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
    if (data) setCustomers(data);
    setLoading(false);
  }

  async function addCustomer() {
    const { error } = await supabase.from('customers').insert([form]);
    if (!error) {
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', company: '', city: '', state: '' });
      fetchCustomers();
    }
  }

  function copyPortalLink(customer) {
    const link = `${window.location.origin}/portal/${customer.portal_token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(customer.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Customers</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{customers.length} total customers</div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ New Customer</button>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Name', 'Company', 'Email', 'Phone', 'City', 'Portal Link'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>}
                {!loading && customers.length === 0 && <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>No customers yet. Add your first one!</td></tr>}
                {customers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{c.company || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#2563eb' }}>{c.email || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{c.city || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button
                        onClick={() => copyPortalLink(c)}
                        style={{ padding: '5px 12px', background: copiedId === c.id ? '#dcfce7' : 'white', color: copiedId === c.id ? '#15803d' : '#374151', border: '1px solid', borderColor: copiedId === c.id ? '#86efac' : '#e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
                      >
                        {copiedId === c.id ? '✓ Copied!' : '🔗 Copy Link'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>New Customer</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Jeff Savard' },
              { key: 'company', label: 'Company', placeholder: 'Blue Rocket' },
              { key: 'email', label: 'Email', placeholder: 'jeff@bluerocket.com' },
              { key: 'phone', label: 'Phone', placeholder: '+1 (615) 000-0000' },
              { key: 'city', label: 'City', placeholder: 'Smyrna' },
              { key: 'state', label: 'State', placeholder: 'TN' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{field.label}</label>
                <input value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={addCustomer} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
