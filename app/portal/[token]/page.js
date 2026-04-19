'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { use } from 'react';

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

export default function CustomerPortal({ params }) {
  const { token } = use(params);
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayJob, setSelectedPayJob] = useState(null);
  const [paymentType, setPaymentType] = useState('full');
  const [customAmount, setCustomAmount] = useState('');
  const [paying, setPaying] = useState(null);

  useEffect(() => { fetchData(); }, [token]);

  async function fetchData() {
    setLoading(true);
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('portal_token', token)
      .eq('portal_enabled', true)
      .single();

    if (!customerData) { setNotFound(true); setLoading(false); return; }
    setCustomer(customerData);

    const [{ data: jobsData }, { data: settingsData }] = await Promise.all([
      supabase.from('jobs').select('*, job_items(*)').eq('customer_id', customerData.id).order('created_at', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ]);

    setJobs(jobsData || []);
    setShopSettings(settingsData);
    setLoading(false);
  }

  async function acceptJob(job) {
    setActionLoading(job.id);
    try {
      await supabase.from('jobs').update({
        status: 'Awaiting Payment',
        accepted_at: new Date().toISOString(),
        amount_due: job.total,
        payment_status: 'Unpaid',
      }).eq('id', job.id);

      await fetchData();
      const updated = { ...job, status: 'Awaiting Payment', amount_due: job.total };
      setSelectedPayJob(updated);
      setShowPaymentModal(true);
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setActionLoading(null);
  }

  async function rejectJob() {
    if (!rejectionReason) { alert('Please provide a reason'); return; }
    setActionLoading(selectedJob.id);
    await supabase.from('jobs').update({
      status: 'Cancelled',
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    }).eq('id', selectedJob.id);
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedJob(null);
    await fetchData();
    setActionLoading(null);
  }

  function getPaymentAmount() {
    if (!selectedPayJob) return 0;
    const due = selectedPayJob.amount_due || selectedPayJob.total || 0;
    if (paymentType === 'full') return due;
    if (paymentType === 'deposit') return Math.round(due * (shopSettings?.deposit_percentage || 50) / 100 * 100) / 100;
    if (paymentType === 'custom') return parseFloat(customAmount) || 0;
    return 0;
  }

  async function handlePayment(job, amount, type) {
    setPaying(job.id);
    const res = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        customerName: customer.name,
        customerEmail: customer.email,
        orderId: job.id,
        description: type + ' Payment — ' + (shopSettings?.shop_name || 'Blue Rocket'),
        portalToken: token,
        invoiceId: job.id,
      }),
    });
    const { url, error } = await res.json();
    if (error) { alert('Payment error: ' + error); setPaying(null); return; }
    window.location.href = url;
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading your portal...</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Portal Not Found</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>This link is invalid or has expired.</p>
      </div>
    </div>
  );

  const shopName = shopSettings?.shop_name || 'Blue Rocket';
  const prefix = shopSettings?.quote_prefix || 'J';
  const pendingJobs = jobs.filter(j => j.status === 'New Quote' || j.status === 'Quote Sent');
  const activeJobs = jobs.filter(j => ['Awaiting Payment', 'In Production', 'Ready for Pickup'].includes(j.status));
  const unpaidJobs = jobs.filter(j => (j.status === 'Awaiting Payment' || j.payment_status === 'Partial') && (j.amount_due || 0) > 0);
  const completedJobs = jobs.filter(j => j.status === 'Delivered' || j.status === 'Cancelled');
  const totalDue = unpaidJobs.reduce((s, j) => s + (j.amount_due || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fb', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#111827', padding: '0 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '22px' }}>🚀</div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>{shopName}</div>
              <div style={{ color: '#9ca3af', fontSize: '11px' }}>Customer Portal</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{customer.name}</div>
            {customer.company && <div style={{ color: '#9ca3af', fontSize: '11px' }}>{customer.company}</div>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '28px 24px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: '#111827' }}>Welcome back, {customer.name.split(' ')[0]}! 👋</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{shopSettings?.portal_welcome_message || 'Here is everything you need in one place.'}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Total Jobs', value: jobs.length, icon: '📋' },
            { label: 'Pending Review', value: pendingJobs.length, icon: '📄' },
            { label: 'In Progress', value: activeJobs.length, icon: '⚙️' },
            { label: 'Balance Due', value: '$' + totalDue.toFixed(2), icon: '💲', red: totalDue > 0 },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: s.red ? '#dc2626' : '#111827' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* PENDING QUOTES */}
        {pendingJobs.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Action Required</h2>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>{pendingJobs.length} quote{pendingJobs.length > 1 ? 's' : ''} to review</span>
            </div>
            {pendingJobs.map((job, i) => {
              const sc = STATUS_COLORS[job.status] || STATUS_COLORS['New Quote'];
              return (
                <div key={job.id} style={{ background: 'white', border: '2px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>{prefix}-{String(job.job_number || '').padStart(4, '0')}</div>
                      {job.due_date && <div style={{ fontSize: '12px', color: '#6b7280' }}>Valid until: {job.due_date}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 700 }}>${(job.total || 0).toFixed(2)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{job.status}</span>
                    </div>
                  </div>

                  {job.job_items && job.job_items.length > 0 && (
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                      {job.job_items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f0f1f3' }}>
                          <span>{item.description} {item.color && '(' + item.color + ')'} x {item.quantity}</span>
                          <span style={{ fontWeight: 600 }}>${(item.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {job.notes && <div style={{ background: '#fffbeb', borderRadius: '6px', padding: '10px 12px', fontSize: '13px', color: '#92400e', marginBottom: '14px' }}>📝 {job.notes}</div>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => acceptJob(job)} disabled={actionLoading === job.id} style={{ flex: 2, padding: '13px', background: actionLoading === job.id ? '#86efac' : '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {actionLoading === job.id ? 'Processing...' : 'Accept Quote & Pay'}
                    </button>
                    <button onClick={() => { setSelectedJob(job); setShowRejectModal(true); }} style={{ flex: 1, padding: '13px', background: 'white', border: '2px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ACTIVE JOBS */}
        {activeJobs.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Active Jobs</h2>
            </div>
            {activeJobs.map(job => {
              const sc = STATUS_COLORS[job.status] || STATUS_COLORS['Accepted'];
              const needsPayment = job.status === 'Awaiting Payment' || (job.payment_status === 'Partial' && (job.amount_due || 0) > 0);
              return (
                <div key={job.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>{prefix}-{String(job.job_number || '').padStart(4, '0')}</div>
                      {job.customer_due_date && <div style={{ fontSize: '12px', color: '#6b7280' }}>Due: {job.customer_due_date}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>${(job.total || 0).toFixed(2)}</div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600 }}>{job.status}</span>
                    </div>
                  </div>

                  {/* Payment summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: needsPayment ? '14px' : '0' }}>
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Total</div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>${(job.total || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Paid</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>${(job.amount_paid || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: (job.amount_due || 0) > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Balance Due</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: (job.amount_due || 0) > 0 ? '#dc2626' : '#16a34a' }}>${(job.amount_due || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  {needsPayment && (
                    <button onClick={() => { setSelectedPayJob(job); setShowPaymentModal(true); }} style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      💳 Make Payment
                    </button>
                  )}

                  {job.status !== 'Awaiting Payment' && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        {['Accepted', 'In Production', 'Ready for Pickup', 'Delivered'].map((stage, idx) => {
                          const stages = ['Accepted', 'In Production', 'Ready for Pickup', 'Delivered'];
                          const currentIdx = stages.indexOf(job.status);
                          const isPast = idx <= currentIdx;
                          return (
                            <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: isPast ? '#2563eb' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3px' }}>
                                {isPast && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }} />}
                              </div>
                              <div style={{ fontSize: '9px', color: isPast ? '#2563eb' : '#9ca3af', fontWeight: isPast ? 600 : 400, textAlign: 'center' }}>{stage}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* COMPLETED JOBS */}
        {completedJobs.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>History</h2>
            </div>
            {completedJobs.map(job => {
              const sc = STATUS_COLORS[job.status] || STATUS_COLORS['Delivered'];
              return (
                <div key={job.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{prefix}-{String(job.job_number || '').padStart(4, '0')}</div>
                    {job.rejection_reason && <div style={{ fontSize: '12px', color: '#dc2626' }}>Rejected: {job.rejection_reason}</div>}
                    {job.accepted_at && <div style={{ fontSize: '12px', color: '#16a34a' }}>Completed {new Date(job.accepted_at).toLocaleDateString()}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>${(job.total || 0).toFixed(2)}</div>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{job.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {jobs.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>No jobs yet. We will reach out soon!</p>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: '#9ca3af', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
          <p style={{ margin: '0 0 4px' }}>Questions? <a href={'mailto:' + (shopSettings?.shop_email || 'hello@rockethq.io')} style={{ color: '#2563eb' }}>{shopSettings?.shop_email || 'hello@rockethq.io'}</a></p>
          <p style={{ margin: 0 }}>Powered by <strong style={{ color: '#374151' }}>RocketHQ</strong></p>
        </div>
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Why are you rejecting this quote?</h2>
              <span onClick={() => { setShowRejectModal(false); setSelectedJob(null); setRejectionReason(''); }} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {['Price is too high', 'Timeline does not work', 'Going with someone else', 'Need to make changes', 'Project cancelled', 'Other'].map(reason => (
                  <button key={reason} onClick={() => setRejectionReason(reason)} style={{ padding: '10px 14px', background: rejectionReason === reason ? '#fee2e2' : '#f9fafb', border: '1px solid', borderColor: rejectionReason === reason ? '#fca5a5' : '#e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: rejectionReason === reason ? 600 : 400, cursor: 'pointer', textAlign: 'left', color: rejectionReason === reason ? '#b91c1c' : '#374151', fontFamily: 'inherit' }}>
                    {reason}
                  </button>
                ))}
              </div>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Add more details..." rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => { setShowRejectModal(false); setSelectedJob(null); setRejectionReason(''); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={rejectJob} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedPayJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Choose Payment Amount</h2>
              <span onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Balance Due</span>
                <span style={{ fontSize: '18px', fontWeight: 700 }}>${(selectedPayJob.amount_due || selectedPayJob.total || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  { id: 'full', label: 'Pay in Full', sub: 'Order goes straight to production', amount: (selectedPayJob.amount_due || selectedPayJob.total || 0).toFixed(2) },
                  { id: 'deposit', label: (shopSettings?.deposit_percentage || 50) + '% Deposit', sub: 'Balance due on completion', amount: Math.round((selectedPayJob.amount_due || selectedPayJob.total || 0) * (shopSettings?.deposit_percentage || 50) / 100 * 100) / 100 },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setPaymentType(opt.id)} style={{ padding: '16px', background: paymentType === opt.id ? '#eff6ff' : '#f9fafb', border: '2px solid', borderColor: paymentType === opt.id ? '#2563eb' : '#e5e7eb', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: paymentType === opt.id ? '#1d4ed8' : '#111827' }}>{opt.label}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{opt.sub}</div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: paymentType === opt.id ? '#2563eb' : '#111827' }}>${opt.amount}</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => setPaymentType('custom')} style={{ padding: '16px', background: paymentType === 'custom' ? '#eff6ff' : '#f9fafb', border: '2px solid', borderColor: paymentType === 'custom' ? '#2563eb' : '#e5e7eb', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: paymentType === 'custom' ? '#1d4ed8' : '#111827', marginBottom: paymentType === 'custom' ? '10px' : '0' }}>Custom Amount</div>
                  {paymentType === 'custom' && <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="Enter amount..." onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }} />}
                </button>
              </div>
              <button
                onClick={() => handlePayment(selectedPayJob, getPaymentAmount(), paymentType)}
                disabled={paying === selectedPayJob.id || (paymentType === 'custom' && !customAmount)}
                style={{ width: '100%', padding: '14px', background: paying === selectedPayJob.id ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {paying === selectedPayJob.id ? 'Redirecting...' : 'Pay $' + getPaymentAmount().toFixed(2)}
              </button>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>🔒 Secured by Stripe</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
