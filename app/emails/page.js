'use client';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function EmailsPage() {
  const { data: googleSession, status } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailBody, setEmailBody] = useState('');
  const [loadingBody, setLoadingBody] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [checking, setChecking] = useState(true);
  const [supabaseToken, setSupabaseToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else {
        setChecking(false);
        if (session.provider_token) setSupabaseToken(session.provider_token);
      }
    });
  }, []);

  const activeToken = googleSession?.accessToken || supabaseToken;

  useEffect(() => {
    if (activeToken) fetchEmails();
  }, [activeToken]);

  async function fetchEmails(pageToken = null, query = '') {
    setLoading(true);
    const token = activeToken;
    if (!token) { setLoading(false); return; }
    let url = '/api/gmail?limit=25&token=' + encodeURIComponent(token);
    if (pageToken) url += '&pageToken=' + pageToken;
    if (query) url += '&q=' + encodeURIComponent(query);
    const res = await fetch(url);
    const data = await res.json();
    if (data.emails) {
      setEmails(pageToken ? [...emails, ...data.emails] : data.emails);
      setNextPageToken(data.nextPageToken);
    }
    setLoading(false);
  }

  async function fetchEmailBody(id) {
    setLoadingBody(true);
    const token = activeToken || '';
    const res = await fetch('/api/gmail/message?id=' + id + '&token=' + encodeURIComponent(token));
    const data = await res.json();
    setEmailBody(data.body || data.snippet || '');
    setLoadingBody(false);
  }

  async function sendEmail() {
    if (!compose.to || !compose.subject || !compose.body) { alert('Please fill in all fields'); return; }
    setSending(true);
    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...compose, accessToken: activeToken }),
    });
    const data = await res.json();
    if (data.success) {
      alert('Email sent!');
      setShowCompose(false);
      setCompose({ to: '', subject: '', body: '' });
    } else {
      alert('Error: ' + data.error);
    }
    setSending(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getInitials(from) {
    const name = from.replace(/<.*>/, '').trim();
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  function getAvatarColor(from) {
    const colors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b', '#0891b2'];
    let hash = 0;
    for (let i = 0; i < from.length; i++) hash = from.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  if (checking) return null;

  if (!activeToken && status !== 'authenticated') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Topbar />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Connect Your Gmail</h2>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
                Connect your Google Workspace account to view and send emails directly from RocketHQ.
              </p>
              <button
                onClick={() => signIn('google')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', padding: '12px 24px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
                Connect Google Workspace
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#f8f9fb' }}>

          <div style={{ width: '380px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Inbox</h1>
                <button onClick={() => setShowCompose(true)} style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Compose
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchEmails(null, search)} placeholder="Search emails..." style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                <button onClick={() => fetchEmails(null, search)} style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Search</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && emails.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Loading emails...</div>
              ) : emails.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No emails found</div>
              ) : emails.map(email => (
                <div key={email.id} onClick={() => { setSelectedEmail(email); fetchEmailBody(email.id); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedEmail?.id === email.id ? '#eff6ff' : email.unread ? '#fafafa' : 'white' }} onMouseEnter={e => { if (selectedEmail?.id !== email.id) e.currentTarget.style.background = '#f8f9fb'; }} onMouseLeave={e => { if (selectedEmail?.id !== email.id) e.currentTarget.style.background = email.unread ? '#fafafa' : 'white'; }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getAvatarColor(email.from), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {getInitials(email.from)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ fontSize: '13px', fontWeight: email.unread ? 700 : 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {email.from.replace(/<.*>/, '').trim() || email.from}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }}>{formatDate(email.date)}</div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: email.unread ? 600 : 400, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                        {email.subject || '(no subject)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.snippet}
                      </div>
                    </div>
                    {email.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: '4px' }} />}
                  </div>
                </div>
              ))}
              {nextPageToken && (
                <div style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => fetchEmails(nextPageToken, search)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Load more</button>
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedEmail ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '24px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>{selectedEmail.subject || '(no subject)'}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: getAvatarColor(selectedEmail.from), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {getInitials(selectedEmail.from)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{selectedEmail.from.replace(/<.*>/, '').trim()}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{selectedEmail.from.match(/<(.+)>/)?.[1] || selectedEmail.from}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(selectedEmail.date).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button onClick={() => { setCompose({ to: selectedEmail.from.match(/<(.+)>/)?.[1] || selectedEmail.from, subject: 'Re: ' + selectedEmail.subject, body: '' }); setShowCompose(true); }} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Reply</button>
                    <button onClick={() => { setCompose({ to: '', subject: 'Fwd: ' + selectedEmail.subject, body: '' }); setShowCompose(true); }} style={{ padding: '7px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>Forward</button>
                  </div>
                  {loadingBody ? (
                    <div style={{ color: '#9ca3af', fontSize: '13px' }}>Loading...</div>
                  ) : emailBody && emailBody.includes('<') ? (
                    <iframe
                      srcDoc={emailBody}
                      style={{ width: '100%', border: 'none', minHeight: '500px', borderRadius: '4px' }}
                      sandbox="allow-same-origin"
                      onLoad={e => {
                        const iframe = e.target;
                        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{emailBody || selectedEmail.snippet}</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📧</div>
                  <div style={{ fontSize: '14px' }}>Select an email to read</div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#111827', borderRadius: '12px 12px 0 0' }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>New Message</span>
              <span onClick={() => setShowCompose(false)} style={{ cursor: 'pointer', fontSize: '20px', color: '#9ca3af', lineHeight: 1 }}>x</span>
            </div>
            <div>
              <input value={compose.to} onChange={e => setCompose({...compose, to: e.target.value})} placeholder="To" style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              <input value={compose.subject} onChange={e => setCompose({...compose, subject: e.target.value})} placeholder="Subject" style={{ width: '100%', padding: '10px 16px', border: 'none', borderBottom: '1px solid #e5e7eb', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              <textarea value={compose.body} onChange={e => setCompose({...compose, body: e.target.value})} placeholder="Write your message..." rows={10} style={{ width: '100%', padding: '12px 16px', border: 'none', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setShowCompose(false)} style={{ padding: '8px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Discard</button>
              <button onClick={sendEmail} disabled={sending} style={{ padding: '8px 20px', background: sending ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
