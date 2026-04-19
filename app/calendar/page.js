'use client';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const VIEWS = ['month', 'week', 'day'];

const STATUS_COLORS = {
  'New Quote': '#3b82f6',
  'Quote Sent': '#f59e0b',
  'Accepted': '#10b981',
  'Awaiting Payment': '#ef4444',
  'In Production': '#f97316',
  'Ready for Pickup': '#06b6d4',
  'Delivered': '#6b7280',
  'Cancelled': '#9ca3af',
  'New': '#8b5cf6',
  'Sent': '#f59e0b',
  'Ready': '#06b6d4',
};

const STATUS_BG_COLORS = {
  'New Quote': '#dbeafe',
  'Quote Sent': '#fef3c7',
  'Accepted': '#d1fae5',
  'Awaiting Payment': '#fee2e2',
  'In Production': '#ffedd5',
  'Ready for Pickup': '#cffafe',
  'Delivered': '#f3f4f6',
  'Cancelled': '#f3f4f6',
  'New': '#ede9fe',
  'Sent': '#fef3c7',
  'Ready': '#cffafe',
  'High Priority': '#fee2e2',
  'Normal Priority': '#fef3c7',
  'Low Priority': '#f3f4f6',
};

export default function CalendarPage() {
  const { data: googleSession } = useSession();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [calTasks, setCalTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', endTime: '', description: '' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchData(); }
    });
  }, []);

  useEffect(() => {
    if (googleSession?.accessToken) fetchGoogleEvents();
  }, [googleSession, currentDate]);

  async function fetchData() {
    const [{ data: quotesData }, { data: ordersData }, { data: jobsData }, { data: tasksData }] = await Promise.all([
      supabase.from('jobs').select('*, customers(name, company)').not('due_date', 'is', null).in('status', ['New Quote', 'Quote Sent']),
      supabase.from('jobs').select('*, customers(name, company)').not('due_date', 'is', null).not('status', 'in', '("New Quote","Quote Sent","Cancelled","Delivered")'),
      supabase.from('production_jobs').select('*, customers(name)').not('due_date', 'is', null),
      supabase.from('tasks').select('*, customers(name)').not('due_date', 'is', null).neq('status', 'Completed'),
    ]);
    setQuotes(quotesData || []);
    setOrders(ordersData || []);
    setJobs(jobsData || []);
    setCalTasks(tasksData || []);
    setLoading(false);
  }

  async function fetchGoogleEvents() {
    if (!googleSession?.accessToken) return;
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
      const res = await fetch('/api/calendar/events?token=' + encodeURIComponent(googleSession.accessToken) + '&start=' + start + '&end=' + end);
      const data = await res.json();
      setGoogleEvents(data.events || []);
    } catch (err) {
      console.error('Calendar error:', err);
    }
  }

  async function createGoogleEvent() {
    if (!newEvent.title || !newEvent.date) { alert('Title and date are required'); return; }
    setSavingEvent(true);
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvent, accessToken: googleSession?.accessToken }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchGoogleEvents();
        setShowNewEvent(false);
        setNewEvent({ title: '', date: '', time: '', endTime: '', description: '' });
      }
    } catch (err) {
      alert('Error creating event');
    }
    setSavingEvent(false);
  }

  function getAllEventsForDate(dateStr) {
    const events = [];

    quotes.filter(q => q.due_date === dateStr).forEach(q => events.push({
      id: 'q-' + q.id,
      rawId: q.id,
      type: 'quote',
      title: (q.customers?.name || 'Quote') + ' — Quote Due',
      number: 'J-' + String(q.job_number || '').padStart(4, '0'),
      customer: q.customers?.name || 'Unknown Customer',
      company: q.customers?.company || null,
      color: STATUS_COLORS[q.status] || '#3b82f6',
      status: q.status,
      link: '/jobs/' + q.id,
      time: null,
      total: q.total,
    }));

    orders.filter(o => o.due_date === dateStr).forEach(o => events.push({
      id: 'o-' + o.id,
      rawId: o.id,
      type: 'order',
      title: (o.customers?.name || 'Order') + ' — Order Due',
      number: 'J-' + String(o.job_number || '').padStart(4, '0'),
      customer: o.customers?.name || 'Unknown Customer',
      company: o.customers?.company || null,
      color: STATUS_COLORS[o.status] || '#8b5cf6',
      status: o.status,
      link: '/jobs/' + o.id,
      time: null,
      total: o.total,
    }));

    jobs.filter(j => j.due_date === dateStr).forEach(j => events.push({
      id: 'j-' + j.id,
      type: 'job',
      title: j.title || (j.customers?.name + ' — Production'),
      number: j.title || 'Production Job',
      customer: j.customers?.name || 'Production',
      color: '#f97316',
      status: j.stage,
      link: '/production',
      time: null,
    }));

    calTasks.filter(t => t.due_date === dateStr).forEach(t => events.push({
      id: 't-' + t.id,
      rawId: t.id,
      type: 'task',
      title: t.title,
      number: null,
      customer: t.title,
      color: t.priority === 'High' ? '#dc2626' : t.priority === 'Low' ? '#6b7280' : '#f59e0b',
      status: t.priority + ' Priority',
      link: '/tasks',
      time: null,
    }));

    googleEvents.filter(e => {
      const eDate = (e.start?.date || e.start?.dateTime || '').slice(0, 10);
      return eDate === dateStr;
    }).forEach(e => events.push({
      id: 'g-' + e.id,
      type: 'google',
      title: e.summary || '(No title)',
      number: null,
      customer: e.summary || '(No title)',
      color: '#2563eb',
      status: 'Calendar',
      link: null,
      time: e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
    }));

    return events;
  }

  function getMonthDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      const prevDate = new Date(year, month, -firstDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    while (days.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, days.length - daysInMonth - firstDay + 1);
      days.push({ date: nextDate, isCurrentMonth: false });
    }
    return days;
  }

  function getWeekDays() {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  function formatDateStr(date) {
    return date.toISOString().slice(0, 10);
  }

  function navigate(dir) {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  async function handleDrop(dateStr) {
    if (!dragging) return;
    setDragOver(null);

    if (dragging.type === 'task') {
      await supabase.from('tasks').update({ due_date: dateStr }).eq('id', dragging.rawId);
      setCalTasks(calTasks.map(t => t.id === dragging.rawId ? { ...t, due_date: dateStr } : t));
    } else {
      await supabase.from('jobs').update({ due_date: dateStr }).eq('id', dragging.rawId);
      setQuotes(quotes.map(q => q.id === dragging.rawId ? { ...q, due_date: dateStr } : q));
      setOrders(orders.map(o => o.id === dragging.rawId ? { ...o, due_date: dateStr } : o));
    }
    setDragging(null);
  }

  function getHeaderTitle() {
    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const days = getWeekDays();
      return days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' + days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  const today = new Date();
  const todayStr = formatDateStr(today);

  if (checking || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
        <div>Loading calendar...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f9fb' }}>

          {/* Calendar Header */}
          <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setCurrentDate(new Date())} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Today</button>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => navigate(-1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'<'}</button>
                <button onClick={() => navigate(1)} style={{ width: '28px', height: '28px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'>'}</button>
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>{getHeaderTitle()}</h2>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!googleSession?.accessToken && (
                <button onClick={() => signIn('google')} style={{ padding: '6px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Connect Google Calendar
                </button>
              )}
              <button onClick={() => setShowNewEvent(true)} style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ New Event</button>
              <div style={{ display: 'flex', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '7px', overflow: 'hidden' }}>
                {VIEWS.map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', background: view === v ? '#111827' : 'transparent', color: view === v ? 'white' : '#6b7280', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{v}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: '8px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '24px', height: '12px', borderRadius: '3px', background: '#3b82f6' }} />
              Quote
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '24px', height: '12px', borderRadius: '3px', background: '#f97316' }} />
              Active Job
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '24px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
              Accepted
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '24px', height: '12px', borderRadius: '3px', border: '2px dashed #f59e0b', background: 'white' }} />
              Task
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6b7280' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2563eb' }} />
              Google Event
            </div>
          </div>

          {/* MONTH VIEW */}
          {view === 'month' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)' }}>
                {getMonthDays().map(({ date, isCurrentMonth }, idx) => {
                  const dateStr = formatDateStr(date);
                  const events = getAllEventsForDate(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={idx}
                      onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(dateStr)}
                      style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderLeft: idx % 7 === 0 ? 'none' : '1px solid #e5e7eb', background: dragOver === dateStr ? '#f0f9ff' : isToday ? '#eff6ff' : 'white', minHeight: '120px', padding: '6px', transition: 'background 0.15s' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: isToday ? 700 : 400, color: isToday ? '#2563eb' : isCurrentMonth ? '#111827' : '#d1d5db', width: '24px', height: '24px', borderRadius: '50%', background: isToday ? '#2563eb' : 'transparent', color: isToday ? 'white' : isCurrentMonth ? '#111827' : '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {date.getDate()}
                        </span>
                        {events.length > 0 && <span style={{ fontSize: '10px', color: '#9ca3af' }}>{events.length} {events.length === 1 ? 'item' : 'items'}</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {events.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            draggable={event.type !== 'google'}
                            onDragStart={() => event.type !== 'google' && setDragging(event)}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => event.link ? router.push(event.link) : setSelectedEvent(event)}
                            title={event.title}
                            style={{
                              marginBottom: '2px',
                              cursor: event.type !== 'google' ? 'grab' : 'pointer',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              opacity: dragging?.id === event.id ? 0.5 : 1,
                              ...(event.type === 'task' ? {
                                background: 'white',
                                border: '1px dashed ' + event.color,
                                padding: '2px 5px',
                              } : event.type === 'google' ? {
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                padding: '2px 5px',
                              } : {
                                background: event.color,
                                padding: '2px 5px',
                              })
                            }}
                          >
                            {event.type === 'task' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ fontSize: '9px', color: event.color }}>☐</span>
                                <span style={{ fontSize: '10px', fontWeight: 600, color: event.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.customer}</span>
                              </div>
                            )}
                            {event.type === 'google' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: event.color, flexShrink: 0, display: 'inline-block' }} />
                                <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.customer}</span>
                              </div>
                            )}
                            {(event.type === 'quote' || event.type === 'order' || event.type === 'job') && (
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '1px' }}>{event.number}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.customer}</div>
                                {event.company && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.company}</div>}
                                <div style={{ marginTop: '3px', display: 'inline-block', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '3px', padding: '1px 5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>{event.status}</div>
                              </div>
                            )}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div style={{ fontSize: '10px', color: '#6b7280', padding: '1px 6px' }}>+{events.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {view === 'week' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 5 }}>
                {getWeekDays().map((date, idx) => {
                  const dateStr = formatDateStr(date);
                  const isToday = dateStr === todayStr;
                  return (
                    <div key={idx} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isToday ? '#2563eb' : 'transparent', color: isToday ? 'white' : '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, margin: '0 auto' }}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '600px' }}>
                {getWeekDays().map((date, idx) => {
                  const dateStr = formatDateStr(date);
                  const events = getAllEventsForDate(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={idx}
                      onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={() => handleDrop(dateStr)}
                      style={{ borderLeft: idx > 0 ? '1px solid #e5e7eb' : 'none', borderTop: '1px solid #e5e7eb', padding: '8px', background: dragOver === dateStr ? '#f0f9ff' : isToday ? '#eff6ff' : 'white', minHeight: '500px', transition: 'background 0.15s' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {events.map(event => (
                          <div
                            key={event.id}
                            draggable={event.type !== 'google'}
                            onDragStart={() => event.type !== 'google' && setDragging(event)}
                            onDragEnd={() => setDragging(null)}
                            onClick={() => event.link ? router.push(event.link) : setSelectedEvent(event)}
                            style={{
                              marginBottom: '4px',
                              cursor: event.type !== 'google' ? 'grab' : 'pointer',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              lineHeight: 1.5,
                              opacity: dragging?.id === event.id ? 0.5 : 1,
                              ...(event.type === 'task' ? {
                                background: 'white',
                                border: '2px dashed ' + event.color,
                              } : event.type === 'google' ? {
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderLeft: '3px solid ' + event.color,
                              } : {
                                background: event.color,
                                border: 'none',
                              })
                            }}
                          >
                            {event.type === 'task' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                                  <span style={{ fontSize: '11px', color: event.color }}>☐</span>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: event.color }}>Task</span>
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{event.customer}</div>
                              </div>
                            )}
                            {event.type === 'google' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: event.color, display: 'inline-block', flexShrink: 0 }} />
                                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{event.time || 'All day'}</span>
                                </div>
                                <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#374151' }}>{event.customer}</div>
                              </div>
                            )}
                            {(event.type === 'quote' || event.type === 'order' || event.type === 'job') && (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '2px' }}>{event.number}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '1px' }}>{event.customer}</div>
                                {event.company && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginBottom: '3px' }}>{event.company}</div>}
                                <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.2)', color: 'white', borderRadius: '3px', padding: '2px 6px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>{event.status}</div>
                              </div>
                            )}
                          </div>
                        ))}
                        {events.length === 0 && (
                          <div style={{ fontSize: '11px', color: '#e5e7eb', textAlign: 'center', marginTop: '20px' }}>—</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {view === 'day' && (
            <div
              style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}
              onDragOver={e => { e.preventDefault(); setDragOver(formatDateStr(currentDate)); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(formatDateStr(currentDate))}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              {(() => {
                const dateStr = formatDateStr(currentDate);
                const events = getAllEventsForDate(dateStr);
                return events.length === 0 ? (
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
                    <div style={{ fontSize: '14px' }}>Nothing scheduled for today</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {events.map(event => (
                      <div
                        key={event.id}
                        draggable={event.type !== 'google'}
                        onDragStart={() => event.type !== 'google' && setDragging(event)}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => event.link ? router.push(event.link) : setSelectedEvent(event)}
                        style={{ background: 'white', border: '1px solid #e5e7eb', borderLeft: '5px solid ' + event.color, borderRadius: '8px', padding: '12px 16px', cursor: event.type !== 'google' ? 'grab' : 'pointer', display: 'flex', alignItems: 'center', gap: '14px', opacity: dragging?.id === event.id ? 0.5 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{ flex: 1 }}>
                          {event.number && <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{event.number}</div>}
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{event.customer}</div>
                          {event.time && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{event.time}</div>}
                          {event.total && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>${parseFloat(event.total).toFixed(2)}</div>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', padding: '3px 10px', background: event.color, color: 'white', borderRadius: '100px', fontWeight: 700 }}>{event.status || event.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </main>
      </div>

      {/* NEW EVENT MODAL */}
      {showNewEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>New Event</h2>
              <span onClick={() => setShowNewEvent(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Event Title *</label>
                <input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="e.g. Client Meeting" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Date *</label>
                  <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Start Time</label>
                  <input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description</label>
                <textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} rows={3} placeholder="Optional details..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              {!googleSession?.accessToken && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#92400e' }}>
                  Connect Google Calendar to save events to your calendar
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowNewEvent(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={createGoogleEvent} disabled={savingEvent || !googleSession?.accessToken} style={{ padding: '8px 16px', background: savingEvent ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                {savingEvent ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: selectedEvent.color, borderRadius: '12px 12px 0 0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'white' }}>{selectedEvent.title}</h2>
              <span onClick={() => setSelectedEvent(null)} style={{ cursor: 'pointer', fontSize: '20px', color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {selectedEvent.time && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Time: {selectedEvent.time}</div>}
              {selectedEvent.status && <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Status: {selectedEvent.status}</div>}
              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', textTransform: 'capitalize' }}>Type: {selectedEvent.type}</div>
            </div>
            <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedEvent(null)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
