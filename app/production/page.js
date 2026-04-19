'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function ProductionPage() {
  const [jobs, setJobs] = useState([]);
  const [methods, setMethods] = useState([]);
  const [stages, setStages] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [dragJob, setDragJob] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchData(); }
    });
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: methodsData }, { data: jobsData }] = await Promise.all([
      supabase.from('imprint_methods').select('*, production_stages(*)').eq('offered', true).order('sort_order'),
      supabase.from('jobs')
        .select('*, customers(name, company), job_items(*)')
        .in('status', ['Accepted', 'Awaiting Payment', 'In Production', 'Ready for Pickup'])
        .order('created_at', { ascending: true }),
    ]);

    setMethods(methodsData || []);
    setJobs(jobsData || []);

    // Auto-select first method
    if (methodsData?.length > 0 && !selectedMethod) {
      const first = methodsData[0];
      setSelectedMethod(first);
      const sorted = (first.production_stages || []).sort((a, b) => a.sort_order - b.sort_order);
      setStages(sorted);
    }
    setLoading(false);
  }

  function selectMethod(method) {
    setSelectedMethod(method);
    const sorted = (method.production_stages || []).sort((a, b) => a.sort_order - b.sort_order);
    setStages(sorted);
  }

  async function moveJob(jobId, stageId) {
    await supabase.from('jobs').update({ production_stage_id: stageId }).eq('id', jobId);
    setJobs(jobs.map(j => j.id === jobId ? { ...j, production_stage_id: stageId } : j));
    if (selectedJob?.id === jobId) setSelectedJob(prev => ({ ...prev, production_stage_id: stageId }));
  }

  function handleDrop(stageId) {
    if (dragJob && dragJob.production_stage_id !== stageId) moveJob(dragJob.id, stageId);
    setDragJob(null);
    setDragOver(null);
  }

  function getJobsForStage(stageId) {
    // Jobs with this stage
    const withStage = jobs.filter(j => j.production_stage_id === stageId);
    // Jobs with no stage go to first stage of selected method
    if (stages.length > 0 && stageId === stages[0].id) {
      const unstaged = jobs.filter(j => !j.production_stage_id);
      return [...unstaged, ...withStage];
    }
    return withStage;
  }

  function getDaysInProduction(job) {
    const start = job.accepted_at ? new Date(job.accepted_at) : new Date(job.created_at);
    return Math.floor((Date.now() - start) / 86400000);
  }

  function getDueStatus(job) {
    if (!job.production_due_date) return null;
    const diff = Math.floor((new Date(job.production_due_date) - new Date()) / 86400000);
    if (diff < 0) return { label: Math.abs(diff) + 'd overdue', color: '#dc2626', bg: '#fee2e2' };
    if (diff === 0) return { label: 'Due today', color: '#d97706', bg: '#fef3c7' };
    if (diff <= 2) return { label: diff + 'd left', color: '#d97706', bg: '#fef3c7' };
    return { label: diff + 'd left', color: '#16a34a', bg: '#dcfce7' };
  }

  const totalJobs = jobs.length;
  const overdueJobs = jobs.filter(j => j.production_due_date && new Date(j.production_due_date) < new Date()).length;

  if (checking || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
        <div>Loading production board...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Production Board</h1>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  <span style={{ marginRight: '16px' }}><strong style={{ color: '#111827' }}>{totalJobs}</strong> active jobs</span>
                  {overdueJobs > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠ {overdueJobs} overdue</span>}
                </div>
              </div>
              <button onClick={() => router.push('/settings?section=production')} style={{ padding: '7px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⚙ Manage Stages
              </button>
            </div>

            {/* Method tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {methods.map(method => (
                <button
                  key={method.id}
                  onClick={() => selectMethod(method)}
                  style={{ padding: '6px 16px', background: selectedMethod?.id === method.id ? '#111827' : 'white', color: selectedMethod?.id === method.id ? 'white' : '#374151', border: '1px solid', borderColor: selectedMethod?.id === method.id ? '#111827' : '#e5e7eb', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {method.name}
                  <span style={{ marginLeft: '6px', background: selectedMethod?.id === method.id ? 'rgba(255,255,255,0.2)' : '#f3f4f6', padding: '1px 6px', borderRadius: '100px', fontSize: '11px' }}>
                    {jobs.filter(j => (method.production_stages || []).some(s => s.id === j.production_stage_id) || (!j.production_stage_id && method.id === methods[0]?.id)).length}
                  </span>
                </button>
              ))}
              {methods.length === 0 && (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>No imprint methods configured. <span onClick={() => router.push('/settings?section=imprint')} style={{ color: '#2563eb', cursor: 'pointer' }}>Set up methods →</span></div>
              )}
            </div>
          </div>

          {/* Board */}
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', height: '100%', minWidth: 'max-content' }}>
              {stages.map(stage => {
                const stageJobs = getJobsForStage(stage.id);
                return (
                  <div
                    key={stage.id}
                    onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(stage.id)}
                    style={{ width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: dragOver === stage.id ? '#f0f9ff' : '#f3f4f6', borderRadius: '10px', border: '2px solid', borderColor: dragOver === stage.id ? '#2563eb' : 'transparent', transition: 'all 0.15s' }}
                  >
                    {/* Column Header */}
                    <div style={{ padding: '10px 12px', borderBottom: '3px solid ' + stage.color, borderRadius: '8px 8px 0 0', background: 'white' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stage.color }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{stage.name}</span>
                          {stage.embellishment_stage && <span style={{ fontSize: '9px', background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: '100px', fontWeight: 700 }}>EMB</span>}
                          {stage.requires_garment && <span style={{ fontSize: '9px', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '100px', fontWeight: 700 }}>GRMNT</span>}
                        </div>
                        <span style={{ fontSize: '11px', background: stage.color + '20', color: stage.color, padding: '2px 7px', borderRadius: '100px', fontWeight: 700 }}>{stageJobs.length}</span>
                      </div>
                    </div>

                    {/* Job Cards */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {stageJobs.length === 0 ? (
                        <div style={{ border: '2px dashed #e5e7eb', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#d1d5db', fontSize: '12px' }}>Drop jobs here</div>
                      ) : stageJobs.map(job => {
                        const dueStatus = getDueStatus(job);
                        const days = getDaysInProduction(job);
                        const imprints = [...new Set((job.job_items || []).map(i => i.imprint_method).filter(Boolean))];
                        return (
                          <div
                            key={job.id}
                            draggable
                            onDragStart={() => setDragJob(job)}
                            onDragEnd={() => setDragJob(null)}
                            onClick={() => setSelectedJob(job)}
                            style={{ background: 'white', borderRadius: '8px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'grab', border: '1px solid #e5e7eb', borderLeft: '4px solid ' + stage.color, opacity: dragJob?.id === job.id ? 0.5 : 1 }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>J-{String(job.job_number || '').padStart(4, '0')}</div>
                              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{days}d</div>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.customers?.name || 'Unknown'}</div>
                            {job.customers?.company && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.customers.company}</div>}
                            {imprints.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                {imprints.map(m => <span key={m} style={{ fontSize: '10px', background: '#ede9fe', color: '#6d28d9', padding: '1px 6px', borderRadius: '100px', fontWeight: 600 }}>{m}</span>)}
                              </div>
                            )}
                            {job.job_items?.length > 0 && (
                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                {job.job_items.length} item{job.job_items.length > 1 ? 's' : ''} · {job.job_items.reduce((s, i) => s + (i.quantity || 0), 0)} pcs
                              </div>
                            )}
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>${(job.total || 0).toFixed(2)}</div>
                            {dueStatus && <div style={{ background: dueStatus.bg, color: dueStatus.color, fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>{dueStatus.label}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {stages.length === 0 && selectedMethod && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>No stages configured for {selectedMethod.name}</div>
                    <button onClick={() => router.push('/settings?section=production')} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Configure Stages</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '620px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>J-{String(selectedJob.job_number || '').padStart(4, '0')}</h2>
                  <span style={{ background: '#f3f4f6', color: '#374151', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>
                    {stages.find(s => s.id === selectedJob.production_stage_id)?.name || stages[0]?.name || 'Unassigned'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{selectedJob.customers?.name}</div>
                {selectedJob.customers?.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{selectedJob.customers.company}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => router.push('/jobs/' + selectedJob.id)} style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View Job</button>
                <span onClick={() => setSelectedJob(null)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>Move to Stage</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {stages.map(stage => (
                  <button key={stage.id} onClick={() => moveJob(selectedJob.id, stage.id)} style={{ padding: '5px 12px', background: selectedJob.production_stage_id === stage.id ? stage.color : 'white', color: selectedJob.production_stage_id === stage.id ? 'white' : '#374151', border: '1px solid', borderColor: selectedJob.production_stage_id === stage.id ? stage.color : '#e5e7eb', borderRadius: '100px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {stage.name}
                  </button>
                ))}
              </div>

              {selectedJob.job_items?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase' }}>Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedJob.job_items.map((item, i) => (
                      <div key={i} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || item.item_type}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.color && item.color + ' · '}Qty: {item.quantity}{item.imprint_method && ' · ' + item.imprint_method}</div>
                          {item.imprint_location && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{item.imprint_location} · {item.imprint_colors} color{item.imprint_colors > 1 ? 's' : ''}</div>}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>${(item.total || 0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.production_notes && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>PRODUCTION NOTES</div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{selectedJob.production_notes}</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[{ label: 'Due Date', value: selectedJob.due_date }, { label: 'Production Due', value: selectedJob.production_due_date }].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
