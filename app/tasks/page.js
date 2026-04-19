'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const PRIORITIES = ['Low', 'Normal', 'High'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [filter, setFilter] = useState('open');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'Normal', assigned_to: '', customer_id: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchAll(); }
    });
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: tasksData }, { data: customersData }, { data: staffData }] = await Promise.all([
      supabase.from('tasks').select('*, customers(name, company)').order('due_date', { ascending: true }),
      supabase.from('customers').select('id, name, company'),
      supabase.from('staff').select('*').eq('active', true),
    ]);
    setTasks(tasksData || []);
    setCustomers(customersData || []);
    setStaff(staffData || []);
    setLoading(false);
  }

  async function saveTask() {
    if (!form.title) { alert('Title is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('tasks').insert([{ ...form, customer_id: form.customer_id || null }]);
    if (error) { alert('Error: ' + error.message); }
    else { setShowModal(false); setForm({ title: '', description: '', due_date: '', priority: 'Normal', assigned_to: '', customer_id: '' }); await fetchAll(); }
    setSaving(false);
  }

  async function toggleTask(task) {
    const newStatus = task.status === 'Completed' ? 'Open' : 'Completed';
    const completed_at = newStatus === 'Completed' ? new Date().toISOString() : null;
    await supabase.from('tasks').update({ status: newStatus, completed_at }).eq('id', task.id);
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at } : t));
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
  }

  const filtered = tasks.filter(t => {
    if (filter === 'open') return t.status !== 'Completed';
    if (filter === 'completed') return t.status === 'Completed';
    if (filter === 'overdue') return t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date();
    return true;
  });

  const stats = {
    open: tasks.filter(t => t.status !== 'Completed').length,
    overdue: tasks.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) < new Date()).length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  if (checking) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Tasks</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Manage your team tasks</div>
            </div>
            <button onClick={() => setShowModal(true)} style={{ padding: '9px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              + New Task
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Open', value: stats.open, color: '#2563eb', bg: '#eff6ff', filter: 'open' },
              { label: 'Overdue', value: stats.overdue, color: '#dc2626', bg: '#fee2e2', filter: 'overdue' },
              { label: 'Completed', value: stats.completed, color: '#16a34a', bg: '#f0fdf4', filter: 'completed' },
            ].map(s => (
              <div key={s.label} onClick={() => setFilter(s.filter)} style={{ background: filter === s.filter ? s.bg : 'white', border: '1px solid', borderColor: filter === s.filter ? s.color + '40' : '#e5e7eb', borderRadius: '10px', padding: '16px 20px', cursor: 'pointer' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: filter === s.filter ? s.color : '#111827' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            {['all', 'open', 'overdue', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', background: filter === f ? '#111827' : 'white', color: filter === f ? 'white' : '#6b7280', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>

          {/* Tasks List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
              <div>No {filter} tasks</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(task => {
                const isOverdue = task.status !== 'Completed' && task.due_date && new Date(task.due_date) < new Date();
                return (
                  <div key={task.id} style={{ background: 'white', border: '1px solid', borderColor: isOverdue ? '#fecaca' : '#e5e7eb', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div onClick={() => toggleTask(task)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid', borderColor: task.status === 'Completed' ? '#16a34a' : isOverdue ? '#dc2626' : '#d1d5db', background: task.status === 'Completed' ? '#16a34a' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      {task.status === 'Completed' && <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: task.status === 'Completed' ? '#9ca3af' : '#111827', textDecoration: task.status === 'Completed' ? 'line-through' : 'none', marginBottom: '4px' }}>
                        {task.title}
                      </div>
                      {task.description && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{task.description}</div>}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {task.due_date && (
                          <span style={{ fontSize: '12px', color: isOverdue ? '#dc2626' : '#6b7280', fontWeight: isOverdue ? 600 : 400 }}>
                            {isOverdue ? '⚠ ' : ''}Due: {task.due_date}
                          </span>
                        )}
                        {task.assigned_to && <span style={{ fontSize: '12px', color: '#6b7280' }}>👤 {task.assigned_to}</span>}
                        {task.customers && (
                          <span onClick={() => router.push('/customers/' + task.customer_id)} style={{ fontSize: '12px', color: '#2563eb', cursor: 'pointer' }}>
                            🏢 {task.customers.company || task.customers.name}
                          </span>
                        )}
                        <span style={{ background: task.priority === 'High' ? '#fee2e2' : task.priority === 'Low' ? '#f3f4f6' : '#fef3c7', color: task.priority === 'High' ? '#dc2626' : task.priority === 'Low' ? '#6b7280' : '#b45309', padding: '1px 7px', borderRadius: '100px', fontSize: '10px', fontWeight: 700 }}>{task.priority}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Delete</button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* NEW TASK MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>New Task</h2>
              <span onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Task Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Follow up on quote" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Assign To</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Customer</label>
                  <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">No customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ' — ' + c.company : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Optional details..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveTask} disabled={saving} style={{ padding: '8px 16px', background: saving ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
