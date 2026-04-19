'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const STATUS_COLORS = {
  'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
  'Quote Sent': { bg: '#fef3c7', color: '#b45309' },
  'Accepted': { bg: '#dcfce7', color: '#15803d' },
  'Awaiting Payment': { bg: '#fee2e2', color: '#b91c1c' },
  'In Production': { bg: '#ede9fe', color: '#5b21b6' },
  'Ready for Pickup': { bg: '#d1fae5', color: '#065f46' },
  'Delivered': { bg: '#f3f4f6', color: '#4b5563' },
  'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [settings, setSettings] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchJobs(); fetchSettings(); }
    });
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
  }

  async function fetchJobs() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, company, email)')
      .order('created_at', { ascending: false });
    setJobs(data || []);
    setLoading(false);
  }

  async function createNewJob() {
    const { data: numData } = await supabase.rpc('get_next_job_number');
    const { data: job, error } = await supabase
      .from('jobs')
      .insert([{ status: 'New Quote', job_number: numData, total: 0 }])
      .select()
      .single();
    if (error) { alert('Error: ' + error.message); return; }
    router.push('/jobs/' + job.id);
  }

  const prefix = settings?.quote_prefix || 'J';
  const allStatuses = Object.keys(STATUS_COLORS);

  const filtered = jobs.filter(j => {
    const matchStatus = filterStatus === 'all' || j.status === filterStatus;
    const matchSearch = !search ||
      (j.customers?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (j.customers?.company || '').toLowerCase().includes(search.toLowerCase()) ||
      String(j.job_number || '').includes(search);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: jobs.length,
    quotes: jobs.filter(j => ['New Quote', 'Quote Sent'].includes(j.status)).length,
    active: jobs.filter(j => ['Accepted', 'Awaiting Payment', 'In Production', 'Ready for Pickup'].includes(j.status)).length,
    totalValue: jobs.filter(j => j.status !== 'Cancelled').reduce((s, j) => s + (j.total || 0), 0),
  };

  if (checking) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Jobs</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>All quotes, orders and jobs in one place</div>
            </div>
            <button onClick={createNewJob} style={{ padding: '9px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              + New Job
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Total Jobs', value: stats.total },
              { label: 'Open Quotes', value: stats.quotes, color: '#1d4ed8' },
              { label: 'Active Jobs', value: stats.active, color: '#5b21b6' },
              { label: 'Total Value', value: '$' + stats.totalValue.toFixed(2), color: '#15803d' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: s.color || '#111827' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer or job #..."
              style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => setFilterStatus('all')} style={{ padding: '6px 12px', background: filterStatus === 'all' ? '#111827' : 'white', color: filterStatus === 'all' ? 'white' : '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>All</button>
              {allStatuses.map(s => {
                const sc = STATUS_COLORS[s];
                return (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 12px', background: filterStatus === s ? sc.bg : 'white', color: filterStatus === s ? sc.color : '#6b7280', border: '1px solid', borderColor: filterStatus === s ? sc.color : '#e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
                );
              })}
            </div>
          </div>

          {/* Jobs Table */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Job #', 'Customer', 'Title', 'Due Date', 'Total', 'Payment', 'Status'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No jobs found</td></tr>
                ) : filtered.map((job, i) => {
                  const sc = STATUS_COLORS[job.status] || STATUS_COLORS['New Quote'];
                  const payColor = job.payment_status === 'Paid' ? '#15803d' : job.payment_status === 'Partial' ? '#b45309' : '#b91c1c';
                  return (
                    <tr
                      key={job.id}
                      onClick={() => router.push('/jobs/' + job.id)}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                        {prefix}-{String(job.job_number || '').padStart(4, '0')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{job.customers?.name || '—'}</div>
                        {job.customers?.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{job.customers.company}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{job.title || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{job.due_date || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>${(job.total || 0).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: payColor }}>{job.payment_status || 'Unpaid'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{job.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </main>
      </div>
    </div>
  );
}
