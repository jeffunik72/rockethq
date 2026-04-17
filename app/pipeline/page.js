'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const STAGES = ['New Lead', 'In Contact', 'Qualified', 'Quote Sent', 'Follow Up', 'Closed Won', 'Closed Lost'];

const stageColors = {
  'New Lead': { dot: '#9ca3af', bg: '#f3f4f6', color: '#4b5563' },
  'In Contact': { dot: '#3b82f6', bg: '#dbeafe', color: '#1d4ed8' },
  'Qualified': { dot: '#8b5cf6', bg: '#ede9fe', color: '#5b21b6' },
  'Quote Sent': { dot: '#f59e0b', bg: '#fef3c7', color: '#b45309' },
  'Follow Up': { dot: '#f97316', bg: '#ffedd5', color: '#c2410c' },
  'Closed Won': { dot: '#22c55e', bg: '#dcfce7', color: '#15803d' },
  'Closed Lost': { dot: '#ef4444', bg: '#fee2e2', color: '#b91c1c' },
};

const sourceOptions = ['Website', 'Referral', 'Instagram', 'Facebook', 'Walk-in', 'Email', 'Phone', 'Other'];

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [dragLead, setDragLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '',
    source: '', stage: 'New Lead', notes: '',
    estimated_value: '', assigned_to: ''
  });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchLeads(); fetchCustomers(); }
    });
  }, []);

  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLeads(data);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, company');
    if (data) setCustomers(data);
  }

  async function saveLead() {
    const { error } = await supabase.from('leads').insert([{
      ...form,
      estimated_value: parseFloat(form.estimated_value) || 0,
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ name: '', company: '', email: '', phone: '', source: '', stage: 'New Lead', notes: '', estimated_value: '', assigned_to: '' });
    fetchLeads();
  }

  async function updateLeadStage(leadId, newStage) {
    if (newStage === 'Closed Lost') {
      setSelectedLead(leads.find(l => l.id === leadId));
      setShowLostModal(true);
      return;
    }
    await supabase.from('leads').update({ stage: newStage }).eq('id', leadId);
    fetchLeads();
  }

  async function markLost() {
    await supabase.from('leads').update({ stage: 'Closed Lost', lost_reason: lostReason }).eq('id', selectedLead.id);
    setShowLostModal(false);
    setLostReason('');
    setSelectedLead(null);
    fetchLeads();
  }

  async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
  }

  async function convertToQuote(lead, customerId, dueDate) {
    // Create customer if needed
    let finalCustomerId = customerId;
    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert([{ name: lead.name, company: lead.company, email: lead.email, phone: lead.phone }])
        .select()
        .single();
      finalCustomerId = newCustomer.id;
    }

    // Create quote
    const { data: quote } = await supabase
      .from('quotes')
      .insert([{
        customer_id: finalCustomerId,
        status: 'New Quote',
        total: 0,
        due_date: dueDate || null,
        notes: lead.notes || '',
      }])
      .select()
      .single();

    // Update lead
    await supabase.from('leads').update({
      stage: 'Closed Won',
      quote_id: quote.id,
      converted_at: new Date().toISOString(),
    }).eq('id', lead.id);

    setShowConvertModal(false);
    setSelectedLead(null);
    fetchLeads();
    router.push('/quotes/' + quote.id);
  }

  function handleDragStart(lead) { setDragLead(lead); }
  function handleDragOver(e, stage) { e.preventDefault(); setDragOver(stage); }
  function handleDrop(stage) {
    if (dragLead && dragLead.stage !== stage) updateLeadStage(dragLead.id, stage);
    setDragLead(null);
    setDragOver(null);
  }

  function getLeadsByStage(stage) { return leads.filter(l => l.stage === stage); }

  const totalValue = leads.filter(l => l.stage !== 'Closed Lost').reduce((s, l) => s + (l.estimated_value || 0), 0);
  const wonValue = leads.filter(l => l.stage === 'Closed Won').reduce((s, l) => s + (l.final_value || l.estimated_value || 0), 0);
  const activeLeads = leads.filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length;

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', padding: '24px 28px', background: '#f8f9fb', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Pipeline</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                {activeLeads} active leads · ${totalValue.toFixed(2)} pipeline · ${wonValue.toFixed(2)} closed
              </div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ Add Lead</button>
          </div>

          {/* Kanban */}
          <div style={{ display: 'flex', gap: '10px', flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            {STAGES.map(stage => {
              const stageLeads = getLeadsByStage(stage);
              const sc = stageColors[stage];
              const isOver = dragOver === stage;
              const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

              return (
                <div
                  key={stage}
                  onDragOver={e => handleDragOver(e, stage)}
                  onDrop={() => handleDrop(stage)}
                  style={{ flex: '0 0 210px', background: isOver ? '#eff6ff' : '#f3f4f6', borderRadius: '10px', border: isOver ? '2px dashed #2563eb' : '2px solid transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all .15s' }}
                >
                  {/* Column Header */}
                  <div style={{ padding: '10px 12px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{stage}</span>
                      <span style={{ marginLeft: 'auto', background: 'white', color: '#6b7280', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '100px' }}>{stageLeads.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, paddingLeft: '14px' }}>${stageValue.toFixed(2)}</div>
                    )}
                  </div>

                  {/* Cards */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                    {stageLeads.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>Drop here</div>
                    )}
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        onClick={() => { setSelectedLead(lead); setShowLeadModal(true); }}
                        style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow .15s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{lead.name}</div>
                        {lead.company && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>🏢 {lead.company}</div>}
                        {lead.email && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>✉ {lead.email}</div>}
                        {lead.phone && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>📞 {lead.phone}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {lead.estimated_value > 0 && (
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>Est: ${lead.estimated_value.toFixed(2)}</span>
                            )}
                            {lead.final_value > 0 && (
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>Final: ${lead.final_value.toFixed(2)}</span>
                            )}
                          </div>
                          {lead.source && (
                            <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '2px 7px', borderRadius: '100px', fontWeight: 600 }}>{lead.source}</span>
                          )}
                        </div>
                        {lead.lost_reason && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#b91c1c', background: '#fee2e2', borderRadius: '4px', padding: '4px 8px' }}>
                            ✗ {lead.lost_reason}
                          </div>
                        )}
                        {lead.converted_at && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: '#15803d', background: '#dcfce7', borderRadius: '4px', padding: '4px 8px' }}>
                            ✓ Converted to quote
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* ADD LEAD MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>New Lead</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jeff Savard" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Blue Rocket" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jeff@bluerocket.com" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (615) 000-0000" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Estimated Value</label>
                  <input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select source...</option>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Stage</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Assigned To</label>
                  <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="Jeff" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Lead details, requirements, timeline..." rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveLead} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD DETAIL MODAL */}
      {showLeadModal && selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>{selectedLead.name}</h2>
                {selectedLead.company && <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedLead.company}</div>}
              </div>
              <span onClick={() => { setShowLeadModal(false); setSelectedLead(null); }} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>

              {/* Stage selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Stage</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STAGES.map(s => {
                    const sc = stageColors[s];
                    const isActive = selectedLead.stage === s;
                    return (
                      <button
                        key={s}
                        onClick={async () => {
                          if (s === 'Closed Lost') {
                            setShowLeadModal(false);
                            setShowLostModal(true);
                          } else {
                            await supabase.from('leads').update({ stage: s }).eq('id', selectedLead.id);
                            setSelectedLead({ ...selectedLead, stage: s });
                            fetchLeads();
                          }
                        }}
                        style={{ padding: '4px 12px', borderRadius: '100px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: isActive ? sc.bg : 'white', color: isActive ? sc.color : '#6b7280', borderColor: isActive ? sc.color : '#e5e7eb' }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact info */}
              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>CONTACT INFO</div>
                {selectedLead.email && <div style={{ fontSize: '13px', marginBottom: '6px' }}>✉ <a href={`mailto:${selectedLead.email}`} style={{ color: '#2563eb' }}>{selectedLead.email}</a></div>}
                {selectedLead.phone && <div style={{ fontSize: '13px', marginBottom: '6px' }}>📞 <a href={`tel:${selectedLead.phone}`} style={{ color: '#2563eb' }}>{selectedLead.phone}</a></div>}
                {selectedLead.source && <div style={{ fontSize: '13px', color: '#6b7280' }}>📍 Source: {selectedLead.source}</div>}
              </div>

              {/* Value */}
              {(selectedLead.estimated_value > 0 || selectedLead.final_value > 0) && (                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Estimated Value</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#15803d' }}>${selectedLead.estimated_value.toFixed(2)}</span>
              </div>
            )}
            {selectedLead.final_value > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Final Invoice Value</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#15803d' }}>${selectedLead.final_value.toFixed(2)}</span>
              </div>
            )}
            {selectedLead.estimated_value > 0 && selectedLead.final_value > 0 && (
              <div style={{ background: selectedLead.final_value >= selectedLead.estimated_value ? '#f0fdf4' : '#fef2f2', border: '1px solid', borderColor: selectedLead.final_value >= selectedLead.estimated_value ? '#86efac' : '#fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>vs Estimate</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: selectedLead.final_value >= selectedLead.estimated_value ? '#15803d' : '#dc2626' }}>
                  {selectedLead.final_value >= selectedLead.estimated_value ? '+' : ''}{(selectedLead.final_value - selectedLead.estimated_value).toFixed(2)}
                </span>
              </div>
            
                
              )}

              {/* Notes */}
              {selectedLead.notes && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>NOTES</div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{selectedLead.notes}</div>
                </div>
              )}

              {/* Lost reason */}
              {selectedLead.lost_reason && (
                <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', marginBottom: '4px' }}>LOST REASON</div>
                  <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{selectedLead.lost_reason}</div>
                </div>
              )}

              {/* Convert button */}
              {!selectedLead.converted_at && selectedLead.stage !== 'Closed Lost' && (
                <button
                  onClick={() => { setShowLeadModal(false); setShowConvertModal(true); }}
                  style={{ width: '100%', padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px' }}
                >
                  ✓ Convert to Quote →
                </button>
              )}

              {selectedLead.converted_at && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#15803d', fontWeight: 600, marginBottom: '8px' }}>
                  ✓ Converted to quote on {new Date(selectedLead.converted_at).toLocaleDateString()}
                </div>
              )}

              <button
                onClick={() => { deleteLead(selectedLead.id); setShowLeadModal(false); setSelectedLead(null); }}
                style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOST REASON MODAL */}
      {showLostModal && selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Why was this lead lost?</h2>
              <span onClick={() => { setShowLostModal(false); setSelectedLead(null); }} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {['Price too high', 'Went with competitor', 'No response', 'Changed their mind', 'Timeline didn\'t work', 'Other'].map(reason => (
                  <button
                    key={reason}
                    onClick={() => setLostReason(reason)}
                    style={{ padding: '10px 14px', background: lostReason === reason ? '#fee2e2' : '#f9fafb', border: '1px solid', borderColor: lostReason === reason ? '#fca5a5' : '#e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: lostReason === reason ? 600 : 400, cursor: 'pointer', textAlign: 'left', color: lostReason === reason ? '#b91c1c' : '#374151', fontFamily: 'inherit' }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <textarea
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                placeholder="Or type a custom reason..."
                rows={2}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => { setShowLostModal(false); setSelectedLead(null); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={markLost} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Mark as Lost</button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERT TO QUOTE MODAL */}
      {showConvertModal && selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Convert to Quote</h2>
              <span onClick={() => { setShowConvertModal(false); setSelectedLead(null); }} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600, marginBottom: '4px' }}>Converting: {selectedLead.name}</div>
                <div style={{ fontSize: '12px', color: '#16a34a' }}>This will create a new quote and move the lead to Closed Won</div>
              </div>

              <ConvertForm
                lead={selectedLead}
                customers={customers}
                onConvert={convertToQuote}
                onCancel={() => { setShowConvertModal(false); setSelectedLead(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConvertForm({ lead, customers, onConvert, onCancel }) {
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const existingCustomer = customers.find(c =>
    c.name.toLowerCase() === lead.name.toLowerCase() ||
    (lead.email && c.email === lead.email)
  );

  useEffect(() => {
    if (existingCustomer) setCustomerId(existingCustomer.id);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Link to Existing Customer</label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
          <option value="">Create new customer from lead</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
        </select>
        {!customerId && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>A new customer will be created automatically from the lead info</div>}
        {existingCustomer && <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>✓ Matched to existing customer</div>}
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Quote Due Date</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
        <button onClick={() => onConvert(lead, customerId, dueDate)} style={{ flex: 2, padding: '10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Create Quote →</button>
      </div>
    </div>
  );
}
