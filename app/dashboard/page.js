'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const stats = [
  { label: 'Revenue', value: '$0', note: 'vs previous month', change: '+0.0%' },
  { label: 'Total Orders', value: '0', note: 'This month', change: '+0.0%' },
  { label: 'Total Quotes', value: '2', note: 'This month', change: '+100%' },
  { label: 'Active Customers', value: '0', note: '1 new this month', change: '+100%' },
];

const stats2 = [
  { label: 'Avg Order Value', value: '$0', note: 'Across 0 orders' },
  { label: 'Pipeline Value', value: '$82', note: 'Open quotes' },
  { label: 'Outstanding Invoices', value: '0', note: '$0 unpaid' },
  { label: 'Overdue Amount', value: '$0', note: 'All current', red: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setChecking(false);
    });
  }, []);

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Dashboard</h1>
            <div style={{ display: 'flex', gap: '4px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '3px' }}>
              {['Week', 'Month', 'Year'].map(p => (
                <button key={p} style={{ padding: '4px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px', background: p === 'Month' ? '#2563eb' : 'transparent', color: p === 'Month' ? 'white' : '#374151', fontWeight: 500 }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '16px' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>💲</div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>↑ {s.change}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '16px' }}>
            {stats2.map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.red ? '#dc2626' : '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Revenue Overview</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Order revenue this month</div>
              <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                {Array(14).fill(0).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: '#eff6ff', borderRadius: '3px 3px 0 0', height: '4px' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px', textAlign: 'center' }}>No revenue data yet</div>
            </div>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Sales Pipeline</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Quote status breakdown</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px' }}>
                <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'conic-gradient(#7c3aed 0% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>2<br/>quotes</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px' }}>Quote Conversion</div>
              {[['Conversion Rate','0.0%'],['Total Quotes','2'],['Accepted','0'],['Avg Order Value','$0']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px' }}>Key Performance</div>
              {[['Total Customers','1'],['Quote Conversion','0.0%'],['Avg Order Value','$0'],['Paid Revenue','$0']].map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9fafb', fontSize: '13px' }}>
                  <span style={{ color: '#6b7280' }}>{k}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
