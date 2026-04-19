'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const CUSTOMER_TYPES = ['Retail', 'Wholesale', 'Corporate', 'Non-Profit', 'Government', 'Other'];
const CUSTOMER_TIERS = ['Standard', 'Silver', 'Gold', 'Platinum', 'VIP'];
const INDUSTRIES = ['Apparel', 'Automotive', 'Construction', 'Education', 'Events', 'Food & Beverage', 'Healthcare', 'Non-Profit', 'Real Estate', 'Sports', 'Technology', 'Other'];

export default function CustomerDetailPage({ params }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState('company');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchData();
    });
  }, [id]);

  async function fetchData() {
    const [{ data: cust }, { data: jobsData }, { data: staffData }, { data: settingsData }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('jobs').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('staff').select('*').eq('active', true),
      supabase.from('settings').select('*').single(),
    ]);
    if (!cust) { router.push('/customers'); return; }
    setCustomer(cust);
    setEditForm(cust);
    setJobs(jobsData || []);
    setStaff(staffData || []);
    setSettings(settingsData);
    setLoading(false);
  }

  async function saveCustomer() {
    setSaving(true);
    const { error } = await supabase.from('customers').update(editForm).eq('id', id);
    if (error) { alert('Error: ' + error.message); }
    else {
      setCustomer(editForm);
      setShowEditModal(false);
    }
    setSaving(false);
  }

  function getInitials(name) {
    return (name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#d97706', '#16a34a', '#0891b2'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const prefix = settings?.quote_prefix || 'J';
  const totalSpend = jobs.filter(j => !['New Quote', 'Quote Sent', 'Cancelled'].includes(j.status)).reduce((s, j) => s + (j.total || 0), 0);
  const activeJobs = jobs.filter(j => !['Delivered', 'Cancelled'].includes(j.status)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8f9fb' }}>

          {/* Back */}
          <div style={{ padding: '16px 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => router.push('/customers')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Back to Customers
            </button>
          </div>

          {/* Customer Header */}
          <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: getAvatarColor(customer.company || customer.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {getInitials(customer.company || customer.name)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{customer.company || customer.name}</h1>
                    <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '100px' }}>CUS-{String(customer.id || '').slice(0,6).toUpperCase()}</span>
                    {customer.customer_type && <span style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, textTransform: 'uppercase' }}>{customer.customer_type}</span>}
                    {customer.customer_tier && customer.customer_tier !== 'Standard' && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>{customer.customer_tier}</span>}
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', fontWeight: 500 }}>{customer.name}</div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                    {customer.email && <span>✉ {customer.email}</span>}
                    {customer.phone && <span>📞 {customer.phone}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => { setEditForm(customer); setShowEditModal(true); setEditTab('company'); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✎ Edit Company
                </button>
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/portal/' + customer.portal_token); alert('Portal link copied!'); }} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔗 Portal Link
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
              {[
                { label: 'Total Jobs', value: jobs.length },
                { label: 'Active Jobs', value: activeJobs },
                { label: 'Total Spend', value: '$' + totalSpend.toFixed(2) },
                { label: 'Sales Rep', value: customer.sales_rep || 'Unassigned' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: '0' }}>
            {['overview', 'jobs', 'emails', 'notes'].map(tab => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: activeTab === tab ? '#2563eb' : '#6b7280', borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent', textTransform: 'capitalize' }}>
                {tab === 'jobs' ? 'Jobs (' + jobs.length + ')' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>

          <div style={{ padding: '24px' }}>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Contact Info */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Contact Information</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getAvatarColor(customer.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{customer.name} <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '10px', padding: '1px 6px', borderRadius: '100px', fontWeight: 600 }}>Primary</span></div>
                          {customer.email && <div style={{ fontSize: '12px', color: '#6b7280' }}>✉ {customer.email}</div>}
                          {customer.phone && <div style={{ fontSize: '12px', color: '#6b7280' }}>📞 {customer.phone}</div>}
                        </div>
                      </div>
                    </div>
                    {customer.website && <div style={{ fontSize: '13px', color: '#2563eb' }}>🌐 {customer.website}</div>}
                    {customer.industry && <div style={{ fontSize: '13px', color: '#6b7280' }}>🏢 {customer.industry}</div>}
                    {customer.est_annual_spend > 0 && <div style={{ fontSize: '13px', color: '#6b7280' }}>💰 Est. Annual Spend: ${customer.est_annual_spend}</div>}
                  </div>
                </div>

                {/* Billing Address */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Billing Address</div>
                    <button onClick={() => { setEditForm(customer); setShowEditModal(true); setEditTab('billing'); }} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                  </div>
                  {customer.billing_address ? (
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                      <div>{customer.billing_address}</div>
                      <div>{customer.billing_city}{customer.billing_state ? ', ' + customer.billing_state : ''} {customer.billing_zip}</div>
                    </div>
                  ) : <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No billing address</div>}
                </div>

                {/* Shipping Address */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Shipping Address</div>
                    <button onClick={() => { setEditForm(customer); setShowEditModal(true); setEditTab('shipping'); }} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                  </div>
                  {customer.shipping_address ? (
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>
                      <div>{customer.shipping_address}</div>
                      <div>{customer.shipping_city}{customer.shipping_state ? ', ' + customer.shipping_state : ''} {customer.shipping_zip}</div>
                    </div>
                  ) : <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>No shipping address</div>}
                </div>

                {/* Tax Info */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Tax Information</div>
                    <button onClick={() => { setEditForm(customer); setShowEditModal(true); setEditTab('tax'); }} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Tax ID:</span>
                      <span>{customer.tax_id || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Tax Rate:</span>
                      <span>{customer.tax_rate || 0}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280' }}>Exemption #:</span>
                      <span>{customer.tax_exempt_number || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* JOBS TAB */}
            {activeTab === 'jobs' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>All Jobs</div>
                  <button onClick={() => router.push('/jobs/new?customer=' + id)} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Job</button>
                </div>
                {jobs.length === 0 ? (
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No jobs yet</div>
                ) : (
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                          {['Job #', 'Title', 'Due Date', 'Total', 'Payment', 'Status'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job, i) => {
                          const sc = STATUS_COLORS[job.status] || STATUS_COLORS['New Quote'];
                          return (
                            <tr key={job.id} onClick={() => router.push('/jobs/' + job.id)} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>{prefix}-{String(job.job_number || '').padStart(4, '0')}</td>
                              <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151' }}>{job.title || '—'}</td>
                              <td style={{ padding: '11px 16px', fontSize: '13px', color: '#6b7280' }}>{job.due_date || '—'}</td>
                              <td style={{ padding: '11px 16px', fontSize: '13px', fontWeight: 600 }}>${(job.total || 0).toFixed(2)}</td>
                              <td style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 600, color: job.payment_status === 'Paid' ? '#16a34a' : job.payment_status === 'Partial' ? '#b45309' : '#b91c1c' }}>{job.payment_status || 'Unpaid'}</td>
                              <td style={{ padding: '11px 16px' }}>
                                <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{job.status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* NOTES TAB */}
            {activeTab === 'notes' && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Customer Notes</div>
                <textarea
                  value={editForm.notes || ''}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  onBlur={async () => { await supabase.from('customers').update({ notes: editForm.notes }).eq('id', id); setCustomer({...customer, notes: editForm.notes}); }}
                  rows={8}
                  placeholder="Add notes about this customer..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>
            )}

            {/* EMAILS TAB */}
            {activeTab === 'emails' && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📧</div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>Email history coming soon</div>
                <div style={{ fontSize: '13px' }}>Go to <span onClick={() => router.push('/emails')} style={{ color: '#2563eb', cursor: 'pointer' }}>Emails</span> and search for {customer.email}</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Edit Company Information</h2>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Update company details, addresses, and tax information.</div>
              </div>
              <span onClick={() => setShowEditModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>

            {/* Edit Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
              {['company', 'billing', 'shipping', 'tax'].map(tab => (
                <div key={tab} onClick={() => setEditTab(tab)} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: editTab === tab ? '#2563eb' : '#6b7280', borderBottom: editTab === tab ? '2px solid #2563eb' : '2px solid transparent', textTransform: 'capitalize' }}>
                  {tab === 'tax' ? 'Tax Info' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </div>
              ))}
            </div>

            <div style={{ padding: '24px' }}>

              {/* Company Tab */}
              {editTab === 'company' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company Name</label>
                      <input value={editForm.company || ''} onChange={e => setEditForm({...editForm, company: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer Tier</label>
                      <select value={editForm.customer_tier || 'Standard'} onChange={e => setEditForm({...editForm, customer_tier: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                        {CUSTOMER_TIERS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer Type</label>
                      <select value={editForm.customer_type || 'Retail'} onChange={e => setEditForm({...editForm, customer_type: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                        {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Industry</label>
                      <select value={editForm.industry || ''} onChange={e => setEditForm({...editForm, industry: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Sales Rep</label>
                      <select value={editForm.sales_rep || ''} onChange={e => setEditForm({...editForm, sales_rep: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                        <option value="">Select sales rep</option>
                        {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>First Name</label>
                      <input value={(editForm.name || '').split(' ')[0]} onChange={e => setEditForm({...editForm, name: e.target.value + ' ' + (editForm.name || '').split(' ').slice(1).join(' ')})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Last Name</label>
                      <input value={(editForm.name || '').split(' ').slice(1).join(' ')} onChange={e => setEditForm({...editForm, name: (editForm.name || '').split(' ')[0] + ' ' + e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                    <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                      <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Website</label>
                      <input value={editForm.website || ''} onChange={e => setEditForm({...editForm, website: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Instagram</label>
                      <input value={editForm.instagram || ''} onChange={e => setEditForm({...editForm, instagram: e.target.value})} placeholder="@handle" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Est. Annual Spend</label>
                      <input type="number" value={editForm.est_annual_spend || 0} onChange={e => setEditForm({...editForm, est_annual_spend: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {editTab === 'billing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Address Line 1</label>
                    <input value={editForm.billing_address || ''} onChange={e => setEditForm({...editForm, billing_address: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>City</label>
                      <input value={editForm.billing_city || ''} onChange={e => setEditForm({...editForm, billing_city: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>State/Province</label>
                      <input value={editForm.billing_state || ''} onChange={e => setEditForm({...editForm, billing_state: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>ZIP Code</label>
                    <input value={editForm.billing_zip || ''} onChange={e => setEditForm({...editForm, billing_zip: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                </div>
              )}

              {/* Shipping Tab */}
              {editTab === 'shipping' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Address Line 1</label>
                    <input value={editForm.shipping_address || ''} onChange={e => setEditForm({...editForm, shipping_address: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>City</label>
                      <input value={editForm.shipping_city || ''} onChange={e => setEditForm({...editForm, shipping_city: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>State/Province</label>
                      <input value={editForm.shipping_state || ''} onChange={e => setEditForm({...editForm, shipping_state: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>ZIP Code</label>
                    <input value={editForm.shipping_zip || ''} onChange={e => setEditForm({...editForm, shipping_zip: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <button onClick={() => setEditForm({...editForm, shipping_address: editForm.billing_address, shipping_city: editForm.billing_city, shipping_state: editForm.billing_state, shipping_zip: editForm.billing_zip})} style={{ padding: '8px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
                    Same as Billing Address
                  </button>
                </div>
              )}

              {/* Tax Tab */}
              {editTab === 'tax' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Tax ID</label>
                    <input value={editForm.tax_id || ''} onChange={e => setEditForm({...editForm, tax_id: e.target.value})} placeholder="Enter tax ID" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Tax Rate (%)</label>
                    <input type="number" value={editForm.tax_rate || 0} onChange={e => setEditForm({...editForm, tax_rate: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Tax Exemption Number</label>
                    <input value={editForm.tax_exempt_number || ''} onChange={e => setEditForm({...editForm, tax_exempt_number: e.target.value})} placeholder="Enter tax exemption number (optional)" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={saveCustomer} disabled={saving} style={{ padding: '8px 16px', background: saving ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
