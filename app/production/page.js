'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const STAGES = ['New', 'In Progress', 'QC', 'Ready', 'Delivered'];

const stageColors = {
  'New': { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'In Progress': { bg: '#fef3c7', color: '#b45309', dot: '#f59e0b' },
  'QC': { bg: '#ede9fe', color: '#5b21b6', dot: '#8b5cf6' },
  'Ready': { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  'Delivered': { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' },
};

const priorityColors = {
  'Low': { bg: '#f3f4f6', color: '#6b7280' },
  'Normal': { bg: '#dbeafe', color: '#1d4ed8' },
  'High': { bg: '#fef3c7', color: '#b45309' },
  'Rush': { bg: '#fee2e2', color: '#b91c1c' },
};

export default function ProductionPage() {
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dragJob, setDragJob] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', customer_id: '', order_id: '',
    stage: 'New', method: '', due_date: '', quantity: '',
    assigned_to: '', notes: '', priority: 'Normal'
  });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchJobs(); fetchCustomers(); fetchOrders(); }
    });
  }, []);

  async function fetchJobs() {
    const { data } = await supabase
      .from('production_jobs')
      .select('*, customers(name, company), orders(id)')
      .order('created_at', { ascending: false });
    if (data) setJobs(data);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, company');
    if (data) setCustomers(data);
  }

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('id, total, customers(name)');
    if (data) setOrders(data);
  }

  async function saveJob() {
    const { error } = await supabase.from('production_jobs').insert([{
      ...form,
      quantity: parseInt(form.quantity) || 0,
      order_id: form.order_id || null,
      customer_id: form.customer_id || null,
      due_date: form.due_date || null,
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowModal(false);
    setForm({ title: '', description: '', customer_id: '', order_id: '', stage: 'New', method: '', due_date: '', quantity: '', assigned_to: '', notes: '', priority: 'Normal' });
    fetchJobs();
  }

  async function moveJob(jobId, newStage) {
    await supabase.from('production_jobs').update({ stage: newStage }).eq('id', jobId);
    fetchJobs();
  }

  async function deleteJob(id) {
    if (!confirm('Delete this job?')) return;
    await supabase.from('production_jobs').delete().eq('id', id);
    fetchJobs();
  }

  function handleDragStart(job) { setDragJob(job); }
  function handleDragOver(e, stage) { e.preventDefault(); setDragOver(stage); }
  function handleDrop(stage) {
    if (dragJob && dragJob.stage !== stage) moveJob(dragJob.id, stage);
    setDragJob(null);
    setDragOver(null);
  }

  function getJobsByStage(stage) { return jobs.filter(j => j.stage === stage); }

  if (checking) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', padding: '24px 28px', background: '#f8f9fb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Production Board</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{jobs.length} total jobs · {getJobsByStage('In Progress').length} in progress</div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>+ New Job</button>
          </div>

          <div style={{ display: 'flex', gap: '12px', flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            {STAGES.map(stage => {
              const stageJobs = getJobsByStage(stage);
              const sc = stageColors[stage];
              const isOver = dragOver === stage;
              return (
                <div
                  key={stage}
                  onDragOver={e => handleDragOver(e, stage)}
                  onDrop={() => handleDrop(stage)}
                  style={{ flex: '0 0 240px', background: isOver ? '#f0f5ff' : '#f3f4f6', borderRadius: '10px', border: isOver ? '2px dashed #2563eb' : '2px solid transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'border .15s, background .15s' }}
                >
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{stage}</span>
                    <span style={{ marginLeft: 'auto', background: 'white', color: '#6b7280', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>{stageJobs.length}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                    {stageJobs.length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '12px', border: '2px dashed #e5e7eb', borderRadius: '8px', marginTop: '4px' }}>Drop jobs here</div>
                    )}
                    {stageJobs.map(job => {
                      const pc = priorityColors[job.priority] || priorityColors['Normal'];
                      return (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={() => handleDragStart(job)}
                          style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px', cursor: 'grab', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, flex: 1, lineHeight: 1.3 }}>{job.title}</div>
                            <button onClick={() => deleteJob(job.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '16px', padding: '0 0 0 4px' }}>×</button>
                          </div>
                          {job.customers && (
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>👤 {job.customers.name}</div>
                          )}
                          {job.description && (
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.4 }}>{job.description}</div>
                          )}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {job.method && <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{job.method}</span>}
                            {job.quantity > 0 && <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>qty: {job.quantity}</span>}
                            <span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: '100px', fontSize: '11px', fontWeight: 600 }}>{job.priority}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            {job.due_date ? <div style={{ fontSize: '11px', color: new Date(job.due_date) < new Date() ? '#dc2626' : '#6b7280' }}>📅 {job.due_date}</div> : <div />}
                            {job.assigned_to && <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{job.assigned_to.charAt(0).toUpperCase()}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                            {STAGES.filter(s => s !== stage).map(s => (
                              <button key={s} onClick={() => moveJob(job.id, s)} style={{ flex: 1, padding: '3px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}>→ {s}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>New Production Job</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>×</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Job Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Blue Rocket — 50 Embroidered Hats" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Linked Order</label>
                  <select value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">No linked order</option>
                    {orders.map((o, i) => <option key={o.id} value={o.id}>ORD-{String(i+1).padStart(4,'0')} — {o.customers?.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Imprint Method</label>
                  <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select method...</option>
                    {['Embroidery', 'Screen Printing', 'DTG', 'DTF', 'Heat Press', 'Vinyl'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['Low', 'Normal', 'High', 'Rush'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Assigned To</label>
                <input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} placeholder="e.g. Jeff" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description / Notes</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Colors, sizes, special instructions..." rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={saveJob} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Save Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
