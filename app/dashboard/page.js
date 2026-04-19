'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardPage() {
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState({
    revenue: 0, prevRevenue: 0,
    totalOrders: 0, prevOrders: 0,
    totalQuotes: 0, prevQuotes: 0,
    activeCustomers: 0, newCustomers: 0,
    avgOrderValue: 0,
    pipelineValue: 0,
    outstandingInvoices: 0, outstandingAmount: 0,
    overdueAmount: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [productionStats, setProductionStats] = useState({ active: 0, completed: 0 });
  const [conversionRate, setConversionRate] = useState(0);
  const [totalQuotesCount, setTotalQuotesCount] = useState(0);
  const [acceptedQuotes, setAcceptedQuotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchDashboardData();
    });
  }, [period]);

  function getPeriodDates() {
    const now = new Date();
    let start, end, prevStart, prevEnd;
    if (period === 'week') {
      start = new Date(now); start.setDate(now.getDate() - 7);
      prevStart = new Date(now); prevStart.setDate(now.getDate() - 14);
      prevEnd = new Date(start);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31);
    }
    end = now;
    return { start, end, prevStart, prevEnd };
  }

  async function fetchDashboardData() {
    setLoading(true);
    const { start, end, prevStart, prevEnd } = getPeriodDates();
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const prevStartISO = prevStart.toISOString();
    const prevEndISO = prevEnd.toISOString();

    const [
      { data: orders },
      { data: prevOrders },
      { data: quotes },
      { data: prevQuotes },
      { data: customers },
      { data: invoices },
      { data: jobs },
    ] = await Promise.all([
      supabase.from('jobs').select('*').not('status', 'in', '("New Quote","Quote Sent","Cancelled")').gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('jobs').select('*').not('status', 'in', '("New Quote","Quote Sent","Cancelled")').gte('created_at', prevStartISO).lte('created_at', prevEndISO),
      supabase.from('jobs').select('*').gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('jobs').select('*').gte('created_at', prevStartISO).lte('created_at', prevEndISO),
      supabase.from('customers').select('*').gte('created_at', startISO).lte('created_at', endISO),
      supabase.from('jobs').select('id, total, amount_due, amount_paid, payment_status, status, customer_id').not('status', 'in', '("New Quote","Quote Sent")'),
      supabase.from('production_jobs').select('*'),
    ]);

    // Revenue
    const revenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
    const prevRevenue = (prevOrders || []).reduce((s, o) => s + (o.total || 0), 0);

    // Invoices
    const unpaidInvoices = (invoices || []).filter(i => i.payment_status === 'Unpaid' || i.payment_status === 'Partial');
    const outstandingAmount = unpaidInvoices.reduce((s, i) => s + (i.amount_due || 0), 0);

    // Pipeline
    const openQuotes = (quotes || []).filter(q => q.status === 'New Quote' || q.status === 'Quote Sent');
    const pipelineValue = openQuotes.reduce((s, q) => s + (q.total || 0), 0);

    // Conversion
    const accepted = (quotes || []).filter(q => !['New Quote', 'Quote Sent', 'Cancelled'].includes(q.status)).length;
    const convRate = quotes?.length > 0 ? (accepted / quotes.length * 100).toFixed(1) : 0;

    // All quotes for pipeline chart
    const { data: allQuotes } = await supabase.from('jobs').select('status, total');
    const statusGroups = {};
    (allQuotes || []).forEach(q => {
      statusGroups[q.status] = (statusGroups[q.status] || 0) + 1;
    });
    const pipelineChartData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));

    // Revenue chart — daily
    const dailyRevenue = {};
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyRevenue[key] = 0;
    }
    (orders || []).filter(o => o.customer_id).forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dailyRevenue[key] !== undefined) dailyRevenue[key] += (o.total || 0);
    });
    const revenueChartData = Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount }));

    // Top customers
    const customerTotals = {};
    const customerNames = {};
    (orders || []).filter(o => o.customer_id).forEach(o => {
      customerTotals[o.customer_id] = (customerTotals[o.customer_id] || 0) + (o.total || 0);
    });
    const { data: allCustomers } = await supabase.from('customers').select('id, name, company');
    (allCustomers || []).forEach(c => { customerNames[c.id] = c.name + (c.company ? ' — ' + c.company : ''); });
    const topCusts = Object.entries(customerTotals)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([id, total], i) => ({ rank: i + 1, name: customerNames[id] || 'Unknown', total }));

    // Production
    const activeJobs = (jobs || []).filter(j => j.stage !== 'Delivered' && j.stage !== 'Complete').length;
    const completedJobs = (jobs || []).filter(j => j.stage === 'Delivered' || j.stage === 'Complete').length;

    setStats({
      revenue, prevRevenue,
      totalOrders: orders?.length || 0,
      prevOrders: prevOrders?.length || 0,
      totalQuotes: quotes?.length || 0,
      prevQuotes: prevQuotes?.length || 0,
      activeCustomers: allCustomers?.length || 0,
      newCustomers: customers?.length || 0,
      avgOrderValue: orders?.length > 0 ? revenue / orders.length : 0,
      pipelineValue,
      outstandingInvoices: unpaidInvoices.length,
      outstandingAmount,
      overdueAmount: 0,
    });
    setRevenueData(revenueChartData);
    setPipelineData(pipelineChartData);
    setTopCustomers(topCusts);
    setProductionStats({ active: activeJobs, completed: completedJobs });
    setConversionRate(convRate);
    setTotalQuotesCount(quotes?.length || 0);
    setAcceptedQuotes(accepted);
    setLoading(false);
  }

  function pctChange(current, prev) {
    if (prev === 0) return current > 0 ? '+100%' : '0%';
    const pct = ((current - prev) / prev * 100).toFixed(1);
    return (pct > 0 ? '+' : '') + pct + '%';
  }

  function pctColor(current, prev) {
    if (current >= prev) return '#16a34a';
    return '#dc2626';
  }

  const PIE_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#8b5cf6', '#dc2626'];

  const periodLabel = period === 'week' ? 'vs previous week' : period === 'month' ? 'vs previous month' : 'vs previous year';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
        <div>Loading dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Dashboard</h1>
            <div style={{ display: 'flex', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              {['week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{ padding: '8px 20px', background: period === p ? '#111827' : 'white', color: period === p ? 'white' : '#6b7280', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Top Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '14px' }}>
            {[
              { icon: '$', label: 'Revenue', value: '$' + stats.revenue.toFixed(2), sub: periodLabel, change: pctChange(stats.revenue, stats.prevRevenue), changeColor: pctColor(stats.revenue, stats.prevRevenue) },
              { icon: '🛒', label: 'Total Orders', value: stats.totalOrders, sub: 'This ' + period, change: pctChange(stats.totalOrders, stats.prevOrders), changeColor: pctColor(stats.totalOrders, stats.prevOrders) },
              { icon: '📄', label: 'Total Quotes', value: stats.totalQuotes, sub: 'This ' + period, change: pctChange(stats.totalQuotes, stats.prevQuotes), changeColor: pctColor(stats.totalQuotes, stats.prevQuotes) },
              { icon: '👤', label: 'Active Customers', value: stats.activeCustomers, sub: stats.newCustomers + ' new this ' + period, change: null },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '20px' }}>{stat.icon}</div>
                  {stat.change && <span style={{ fontSize: '12px', fontWeight: 700, color: stat.changeColor }}>{stat.change}</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Second Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { icon: '📈', label: 'Avg Order Value', value: '$' + stats.avgOrderValue.toFixed(2), sub: 'Across ' + stats.totalOrders + ' orders' },
              { icon: '🎯', label: 'Pipeline Value', value: '$' + stats.pipelineValue.toFixed(2), sub: 'Open quotes (Draft + Sent)' },
              { icon: '🧾', label: 'Outstanding Invoices', value: stats.outstandingInvoices, sub: '$' + stats.outstandingAmount.toFixed(2) + ' unpaid', valueColor: stats.outstandingInvoices > 0 ? '#dc2626' : '#111827' },
              { icon: '⚠️', label: 'Overdue Amount', value: '$' + stats.overdueAmount.toFixed(2), sub: 'All current' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: stat.valueColor || '#111827', marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '20px' }}>

            {/* Revenue Chart */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Revenue Overview</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Order revenue this {period}</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={period === 'month' ? 4 : period === 'year' ? 30 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => '$' + v} />
                  <Tooltip formatter={v => ['$' + v.toFixed(2), 'Revenue']} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pipeline Pie Chart */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Sales Pipeline</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Quote status breakdown</div>
              </div>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value + ' quotes', name]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#9ca3af', fontSize: '13px' }}>No quote data yet</div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>

            {/* Quote Conversion */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Quote Conversion</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>Quote to order conversion rate</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Conversion Rate</span>
                <span style={{ fontSize: '22px', fontWeight: 700, color: conversionRate > 0 ? '#16a34a' : '#111827' }}>{conversionRate}%</span>
              </div>
              {[
                ['Total Quotes', totalQuotesCount],
                ['Accepted', acceptedQuotes],
                ['Avg Order Value', '$' + stats.avgOrderValue.toFixed(2)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: label === 'Accepted' && acceptedQuotes === 0 ? '#dc2626' : '#111827' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Production Stats */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Production</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>Current production status</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Active Jobs', value: productionStats.active, color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Completed', value: productionStats.completed, color: '#16a34a', bg: '#f0fdf4' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, marginBottom: '4px' }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/production')} style={{ width: '100%', padding: '8px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                View Production Board
              </button>
            </div>
          </div>

          {/* Top Customers + Key Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>

            {/* Top Customers */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>Top Customers</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>By revenue this {period}</div>
                </div>
                <button onClick={() => router.push('/customers')} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
              </div>
              {topCustomers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>No orders this {period}</div>
              ) : topCustomers.map(c => (
                <div key={c.rank} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>{c.rank}</div>
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#111827' }}>{c.name}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>${c.total.toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Key Performance */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Key Performance</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>Business health at a glance</div>
              {[
                ['Total Customers', stats.activeCustomers],
                ['Quote Conversion', conversionRate + '%'],
                ['Avg Order Value', '$' + stats.avgOrderValue.toFixed(2)],
                ['Pipeline Value', '$' + stats.pipelineValue.toFixed(2)],
                ['Outstanding Invoices', stats.outstandingInvoices],
                ['Paid Revenue', '$' + stats.revenue.toFixed(2)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
