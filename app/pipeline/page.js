'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const STAGES = ['New Lead', 'In Contact', 'Qualified', 'Quote Created', 'Quote Sent', 'Follow Up', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS = {
  'New Lead':      { bg: '#f3f4f6', color: '#4b5563',  dot: '#9ca3af', header: '#f9fafb' },
  'In Contact':    { bg: '#eff6ff', color: '#1d4ed8',  dot: '#3b82f6', header: '#dbeafe' },
  'Qualified':     { bg: '#f0fdf4', color: '#15803d',  dot: '#22c55e', header: '#dcfce7' },
  'Quote Created': { bg: '#faf5ff', color: '#6d28d9',  dot: '#8b5cf6', header: '#ede9fe' },
  'Quote Sent':    { bg: '#fffbeb', color: '#b45309',  dot: '#f59e0b', header: '#fef3c7' },
  'Follow Up':     { bg: '#fff7ed', color: '#c2410c',  dot: '#f97316', header: '#ffedd5' },
  'Closed Won':    { bg: '#f0fdf4', color: '#15803d',  dot: '#22c55e', header: '#dcfce7' },
  'Closed Lost':   { bg: '#fef2f2', color: '#b91c1c',  dot: '#ef4444', header: '#fee2e2' },
};

const SOURCE_OPTIONS = ['Website', 'Referral', 'Instagram', 'Facebook', 'Walk-in', 'Email', 'Phone', 'Other'];
const ACTIVITY_TYPES = ['Note', 'Call', 'Email', 'Meeting'];

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [dragLead, setDragLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [convertDueDate, setConvertDueDate] = useState('');
  const [activities, setActivities] = useState([]);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState('Note');
  const [activityNote, setActivityNote] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: '', stage: 'New Lead', notes: '', estimated_value: '', assigned_to: '' });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchLeads(); fetchStaff(); }
    });
  }, []);

  async function fetchStaff() {
    const { data } = await supabase.from('staff').select('*').eq('active', true);
    if (data) setStaff(data);
  }

  async function fetchLeads() {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function fetchActivities(leadId) {
    const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    setActivities(data || []);
  }

  async function addActivity() {
    if (!activityNote) return;
    setSavingActivity(true);
    const { data } = await supabase.from('lead_activities').insert([{
      lead_id: selectedLead.id,
      type: activityType,
      note: activityNote,
    }]).select().single();
    if (data) {
      setActivities([data, ...activities]);
      setActivityNote('');
      setShowActivityForm(false);
    }
    setSavingActivity(false);
  }

  async function updateStage(lead, newStage) {
    if (newStage === 'Closed Lost') { setSelectedLead(lead); setShowLostModal(true); return; }
    if (newStage === 'Closed Won') { setSelectedLead(lead); setShowConvertModal(true); return; }
    await supabase.from('leads').update({ stage: newStage }).eq('id', lead.id);
    setLeads(leads.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));
    if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, stage: newStage });
  }

  async function markLost() {
    await supabase.from('leads').update({ stage: 'Closed Lost', lost_reason: lostReason }).eq('id', selectedLead.id);
    setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, stage: 'Closed Lost', lost_reason: lostReason } : l));
    setShowLostModal(false);
    setLostReason('');
    setSelectedLead(null);
  }

  async function convertToJob() {
    let finalCustomerId = null;
    const { data: newCustomer } = await supabase.from('customers').insert([{
      name: selectedLead.name, company: selectedLead.company,
      email: selectedLead.email, phone: selectedLead.phone,
      portal_token: crypto.randomUUID(), portal_enabled: true,
    }]).select().single();
    finalCustomerId = newCustomer.id;

    const { data: numData } = await supabase.rpc('get_next_job_number');
    const { data: job } = await supabase.from('jobs').insert([{
      customer_id: finalCustomerId, status: 'New Quote', total: 0,
      job_number: numData, due_date: convertDueDate || null,
      notes: selectedLead.notes || '', lead_id: selectedLead.id,
    }]).select().single();

    await supabase.from('leads').update({
      stage: 'Closed Won', quote_id: job.id,
      converted_at: new Date().toISOString(),
    }).eq('id', selectedLead.id);

    setShowConvertModal(false);
    setSelectedLead(null);
    fetchLeads();
    router.push('/jobs/' + job.id);
  }

  async function addLead() {
    if (!form.name) { alert('Name is required'); return; }
    const { error } = await supabase.from('leads').insert([{
      ...form, estimated_value: parseFloat(form.estimated_value) || 0,
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowAddModal(false);
    setForm({ name: '', company: '', email: '', phone: '', source: '', stage: 'New Lead', notes: '', estimated_value: '', assigned_to: '' });
    fetchLeads();
  }

  async function updateLead() {
    await supabase.from('leads').update({
      name: form.name, company: form.company, email: form.email,
      phone: form.phone, source: form.source, notes: form.notes,
      estimated_value: parseFloat(form.estimated_value) || 0,
      assigned_to: form.assigned_to,
    }).eq('id', selectedLead.id);
    const updated = { ...selectedLead, ...form };
    setLeads(leads.map(l => l.id === selectedLead.id ? updated : l));
    setSelectedLead(updated);
    setShowEditModal(false);
  }

  async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    await supabase.from('leads').delete().eq('id', id);
    setLeads(leads.filter(l => l.id !== id));
    setSelectedLead(null);
  }

  function handleDragStart(lead) { setDragLead(lead); }
  function handleDragOver(e, stage) { e.preventDefault(); setDragOver(stage); }
  async function handleDrop(stage) {
    if (dragLead && dragLead.stage !== stage) await updateStage(dragLead, stage);
    setDragLead(null); setDragOver(null);
  }

  function daysAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 86400000);
    return diff === 0 ? 'Today' : diff === 1 ? '1 day ago' : diff + ' days ago';
  }

  const filtered = leads.filter(l =>
    !search ||
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = leads.filter(l => l.stage !== 'Closed Lost').reduce((s, l) => s + (l.estimated_value || 0), 0);
  const wonValue = leads.filter(l => l.stage === 'Closed Won').reduce((s, l) => s + (l.estimated_value || 0), 0);
  const activeLeads = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.stage)).length;

  if (checking) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pipeline</h1>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                <span><strong style={{ color: '#111827' }}>{activeLeads}</strong> active</span>
                <span><strong style={{ color: '#111827' }}>${totalValue.toLocaleString()}</strong> pipeline</span>
                <span><strong style={{ color: '#16a34a' }}>${wonValue.toLocaleString()}</strong> won</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads by name, company, or email..." style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', width: '280px' }} />
              <button onClick={() => setShowAddModal(true)} style={{ padding: '8px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                + Add Lead
              </button>
            </div>
          </div>

          {/* Kanban Board */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', height: '100%', minWidth: 'max-content' }}>
              {STAGES.map(stage => {
                const sc = STAGE_COLORS[stage];
                const stageLeads = filtered.filter(l => l.stage === stage);
                const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
                return (
                  <div
                    key={stage}
                    onDragOver={e => handleDragOver(e, stage)}
                    onDrop={() => handleDrop(stage)}
                    style={{ width: '220px', display: 'flex', flexDirection: 'column', background: dragOver === stage ? '#f0f9ff' : '#f3f4f6', borderRadius: '10px', border: '2px solid', borderColor: dragOver === stage ? '#2563eb' : 'transparent', transition: 'all 0.15s', flexShrink: 0 }}
                  >
                    {/* Column Header */}
                    <div style={{ padding: '10px 12px', borderRadius: '8px 8px 0 0', background: sc.header }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: sc.color }}>{stage}</span>
                          <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.08)', color: sc.color, padding: '1px 6px', borderRadius: '100px' }}>{stageLeads.length}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: sc.color }}>${stageValue.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => handleDragStart(lead)}
                          onClick={() => { setSelectedLead(lead); setDetailTab('overview'); fetchActivities(lead.id); }}
                          style={{ background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'pointer', border: '1px solid #e5e7eb', opacity: dragLead?.id === lead.id ? 0.5 : 1 }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{lead.name}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{lead.company || 'Unknown Company'}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>${(lead.estimated_value || 0).toLocaleString()}</span>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{daysAgo(lead.created_at)}</span>
                          </div>
                          {lead.assigned_to && (
                            <div style={{ fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: '100px', fontWeight: 600, display: 'inline-block', marginBottom: '4px' }}>{lead.assigned_to}</div>
                          )}
                          {lead.source && (
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{lead.source}</div>
                          )}
                          {lead.notes && (
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.notes}</div>
                          )}
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#d1d5db', fontSize: '12px' }}>Drop here</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* LEAD DETAIL MODAL */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{selectedLead.name}</h2>
                  <span style={{ background: STAGE_COLORS[selectedLead.stage]?.bg, color: STAGE_COLORS[selectedLead.stage]?.color, padding: '2px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{selectedLead.stage}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                  <span>🏢 {selectedLead.company || 'Unknown Company'}</span>
                  <span>💲 ${(selectedLead.estimated_value || 0).toLocaleString()}</span>
                  <span>🕐 Created {daysAgo(selectedLead.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => { setForm({ name: selectedLead.name, company: selectedLead.company || '', email: selectedLead.email || '', phone: selectedLead.phone || '', source: selectedLead.source || '', notes: selectedLead.notes || '', estimated_value: selectedLead.estimated_value || '', assigned_to: selectedLead.assigned_to || '' }); setShowEditModal(true); }} style={{ padding: '6px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✎ Edit</button>
                <button onClick={() => deleteLead(selectedLead.id)} style={{ padding: '6px 14px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑 Delete</button>
                <span onClick={() => setSelectedLead(null)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1, marginLeft: '4px' }}>x</span>
              </div>
            </div>

            {/* Stage Selector */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {STAGES.map(stage => {
                const sc = STAGE_COLORS[stage];
                const isActive = selectedLead.stage === stage;
                return (
                  <button key={stage} onClick={() => updateStage(selectedLead, stage)} style={{ padding: '4px 12px', background: isActive ? sc.bg : 'white', color: isActive ? sc.color : '#6b7280', border: '1px solid', borderColor: isActive ? sc.dot : '#e5e7eb', borderRadius: '100px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {stage}
                  </button>
                );
              })}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
              {['overview', 'activity'].map(tab => (
                <div key={tab} onClick={() => setDetailTab(tab)} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: detailTab === tab ? '#2563eb' : '#6b7280', borderBottom: detailTab === tab ? '2px solid #2563eb' : '2px solid transparent', textTransform: 'capitalize' }}>
                  {tab === 'activity' ? 'Activity & Communication' : 'Overview'}
                </div>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              {detailTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  {/* Contact Info */}
                  <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      👤 Contact Information
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>NAME</span><div style={{ fontWeight: 600 }}>{selectedLead.name}</div></div>
                      {selectedLead.email && <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>EMAIL</span><div style={{ color: '#2563eb' }}>{selectedLead.email}</div></div>}
                      {selectedLead.phone && <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>PHONE</span><div>{selectedLead.phone}</div></div>}
                      {selectedLead.source && <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>SOURCE</span><div>{selectedLead.source}</div></div>}
                      {selectedLead.assigned_to && <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>ASSIGNED TO</span><div>{selectedLead.assigned_to}</div></div>}
                    </div>
                  </div>

                  {/* Company Info */}
                  <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>🏢 Company Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>COMPANY</span><div style={{ fontWeight: 600 }}>{selectedLead.company || 'Unknown Company'}</div></div>
                      {selectedLead.estimated_value > 0 && <div><span style={{ color: '#9ca3af', fontSize: '11px' }}>DEAL VALUE</span><div style={{ fontWeight: 600, color: '#16a34a' }}>${(selectedLead.estimated_value || 0).toLocaleString()}</div></div>}
                    </div>
                    {selectedLead.notes && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>NOTES</div>
                        <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>{selectedLead.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Quote Management */}
                  <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>📋 Quote Management</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Estimated Value</span>
                        <span style={{ fontWeight: 600 }}>${(selectedLead.estimated_value || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Quote Status</span>
                        <span style={{ fontWeight: 600 }}>{selectedLead.converted_at ? 'Created' : 'No Quote'}</span>
                      </div>
                    </div>
                    {!selectedLead.converted_at && selectedLead.stage !== 'Closed Lost' && (
                      <button onClick={() => setShowConvertModal(true)} style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        📄 Create Quote
                      </button>
                    )}
                    {selectedLead.converted_at && (
                      <div style={{ background: '#dcfce7', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                        ✓ Converted to Job
                      </div>
                    )}
                    {selectedLead.stage !== 'Closed Lost' && selectedLead.stage !== 'Closed Won' && (
                      <button onClick={() => setShowLostModal(true)} style={{ width: '100%', padding: '8px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' }}>
                        Mark as Lost
                      </button>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'activity' && (
                <div>
                  {/* Quick Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {ACTIVITY_TYPES.map(type => (
                      <button key={type} onClick={() => { setActivityType(type); setShowActivityForm(true); }} style={{ padding: '12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
                      >
                        {type === 'Note' ? '📝' : type === 'Call' ? '📞' : type === 'Email' ? '📧' : '📅'} {type === 'Note' ? 'Add Note' : type === 'Call' ? 'Log Call' : type === 'Email' ? 'Send Email' : 'Schedule Meeting'}
                      </button>
                    ))}
                  </div>

                  {/* Activity Form */}
                  {showActivityForm && (
                    <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Log {activityType}</div>
                      <textarea value={activityNote} onChange={e => setActivityNote(e.target.value)} placeholder={'Add ' + activityType.toLowerCase() + ' details...'} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowActivityForm(false); setActivityNote(''); }} style={{ padding: '6px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        <button onClick={addActivity} disabled={savingActivity} style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                      </div>
                    </div>
                  )}

                  {/* Activity Feed */}
                  {activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', background: '#f8f9fb', borderRadius: '10px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                      <div>No activities found.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {activities.map(activity => (
                        <div key={activity.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px' }}>
                          <div style={{ fontSize: '20px', flexShrink: 0 }}>
                            {activity.type === 'Note' ? '📝' : activity.type === 'Call' ? '📞' : activity.type === 'Email' ? '📧' : '📅'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{activity.type}</span>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{daysAgo(activity.created_at)}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{activity.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Add New Lead</h2>
              <span onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Status</label>
                  <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Deal Value ($)</label>
                  <input type="number" value={form.estimated_value} onChange={e => setForm({...form, estimated_value: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Source</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select source</option>
                    {SOURCE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addLead} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Add Lead</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Edit Lead</h2>
              <span onClick={() => setShowEditModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Deal Value ($)</label>
                  <input type="number" value={form.estimated_value} onChange={e => setForm({...form, estimated_value: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Assigned To</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={updateLead} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT MODAL */}
      {showConvertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Create Quote</h2>
              <span onClick={() => setShowConvertModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>
                This will create a new job for <strong>{selectedLead?.name}</strong> and move the lead to Closed Won.
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Due Date (optional)</label>
                <input type="date" value={convertDueDate} onChange={e => setConvertDueDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowConvertModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={convertToJob} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Create Quote & Convert</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOST MODAL */}
      {showLostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Mark as Lost</h2>
              <span onClick={() => setShowLostModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {['Price too high', 'Went with competitor', 'Timeline didn\'t work', 'Project cancelled', 'No response', 'Other'].map(reason => (
                  <button key={reason} onClick={() => setLostReason(reason)} style={{ padding: '10px 14px', background: lostReason === reason ? '#fee2e2' : '#f9fafb', border: '1px solid', borderColor: lostReason === reason ? '#fca5a5' : '#e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: lostReason === reason ? 600 : 400, cursor: 'pointer', textAlign: 'left', color: lostReason === reason ? '#b91c1c' : '#374151', fontFamily: 'inherit' }}>
                    {reason}
                  </button>
                ))}
              </div>
              <textarea value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Add more details..." rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowLostModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={markLost} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Mark as Lost</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
