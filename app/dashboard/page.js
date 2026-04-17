'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    quotes: 0,
    orders: 0,
    revenue: 0,
    outstanding: 0,
    paid: 0,
    pipeline: 0,
    accepted: 0,
    inProduction: 0,
  });
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchStats(); }
    });
  }, []);

  async function fetchStats() {
    const [
      { count: customers },
      { count: quotes },
      { count: orders },
      { data: orderData },
      { data: quoteData },
      { data: recentQuoteData },
      { data: recentOrderData },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('quotes').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total, payment_status, status'),
      supabase.from('quotes').select('total, status'),
      supabase.from('quotes').select('*, customers(name, company)').order('created_at', { ascending: false }).limit(5),
      supabase.from('orders').select('*, customers(name, company)').order('created_at', { ascending: false }).limit(5),
    ]);

    const revenue = orderData?.reduce((s, o) => s + (o.total || 0), 0) || 0;
    const outstanding = orderData?.filter(o => o.payment_status === 'Unpaid').reduce((s, o) => s + (o.total || 0), 0) || 0;
    const paid = orderData?.filter(o => o.payment_status === 'Paid').reduce((s, o) => s + (o.total || 0), 0) || 0;
    const pipeline = quoteData?.filter(o => o.status === 'New Quote' || o.status === 'Sent').reduce((s, o) => s + (o.total || 0), 0) || 0;
    const accepted = quoteData?.filter(o => o.status === 'Accepted').length || 0;
    const inProduction = orderData?.filter(o => o.status === 'In Production').length || 0;

    setStats({ customers, quotes, orders, revenue, outstanding, paid, pipeline, accepted, inProduction });
    setRecentQuotes(recentQuoteData || []);
    setRecentOrders(recentOrderData || []);
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

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Dashboard</h1>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* In Production Alert */}
          {stats.inProduction > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⏱ <strong>{stats.inProduction} order{stats.inProduction > 1 ? 's' : ''} currently in production</strong>
              <span onClick={() => router.push('/orders')} style={{ marginLeft: 'auto', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>View Orders →</span>
            </div>
          )}

          {/* Stats Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '16px' }}>
            {[
              { label: 'Total Revenue', value: '$' + stats.revenue.toFixed(2), note: 'All orders', icon: '💲' },
              { label: 'Total Orders', value: stats.orders, note: 'All time', icon: '📋' },
              { label: 'Total Quotes', value: stats.quotes, note: 'All time', icon: '📄' },
              { label: 'Total Customers', value: stats.customers, note: 'Active', icon: '👤' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* Stats Row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '16px' }}>
            {[
              { label: 'Paid Revenue', value: '$' + stats.paid.toFixed(2), note: 'Collected', green: true },
              { label: 'Outstanding', value: '$' + stats.outstanding.toFixed(2), note: 'Unpaid orders', red: stats.outstanding > 0 },
              { label: 'Pipeline Value', value: '$' + stats.pipeline.toFixed(2), note: 'Open quotes' },
              { label: 'Quotes Accepted', value: stats.accepted, note: 'Converted to orders' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.red ? '#dc2626' : s.green ? '#16a34a' : '#111827' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{s.note}</div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Recent Quotes */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Recent Quotes</div>
                <span onClick={() => router.push('/quotes')} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>View all →</span>
              </div>
              {recentQuotes.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No quotes yet</div>
              ) : (
                recentQuotes.map((q, i) => {
                  const sc = statusColors[q.status] || statusColors['New Quote'];
                  return (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{q.customers?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Q-{String(i + 1).padStart(4, '0')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>${(q.total || 0).toFixed(2)}</div>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{q.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recent Orders */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Recent Orders</div>
                <span onClick={() => router.push('/orders')} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>View all →</span>
              </div>
              {recentOrders.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No orders yet</div>
              ) : (
                recentOrders.map((o, i) => {
                  const sc = statusColors[o.status] || statusColors['New'];
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{o.customers?.name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>ORD-{String(i + 1).padStart(4, '0')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>${(o.total || 0).toFixed(2)}</div>
                        <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{o.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
