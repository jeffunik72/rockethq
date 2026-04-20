'use client';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SECTIONS = [
  { id: 'company', label: 'Company Info', icon: '🏢' },
  { id: 'quotes', label: 'Quotes & Invoices', icon: '📄' },
  { id: 'imprint', label: 'Imprint Methods', icon: '🖨' },
  { id: 'production', label: 'Production Settings', icon: '⚙️' },
  { id: 'pricing', label: 'Pricing Engine', icon: '💲' },
  { id: 'portal', label: 'Customer Portal', icon: '🔗' },
  { id: 'payments', label: 'Payments', icon: '💳' },
  { id: 'google', label: 'Google Workspace', icon: '🔗' },
];

const IMPRINT_METHODS = [
  'Embroidery',
  'Screen Printing',
  'DTG',
  'DTF',
  'Heat Press',
  'Vinyl',
  'Sublimation',
  'Laser Engraving',
  'Patch',
  'Richardson',
];

function SettingsPageInner() {
  const [activeSection, setActiveSection] = useState('company');
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data: googleSession, status: googleStatus } = useSession();
  const [supabaseSession, setSupabaseSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSupabaseSession(session);
    });
  }, []);
  const [imprintMethods, setImprintMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [productionStages, setProductionStages] = useState([]);
  const [newStageName, setNewStageName] = useState('');
  const [savingStages, setSavingStages] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const section = searchParams.get('section');
    if (section) setActiveSection(section);
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchSettings(); fetchImprintMethods(); }
    });
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
    setLoading(false);
  }

  async function fetchImprintMethods() {
    const { data } = await supabase.from('imprint_methods').select('*').order('sort_order');
    setImprintMethods(data || []);
  }

  async function toggleMethodOffered(method) {
    const { data } = await supabase.from('imprint_methods').update({ offered: !method.offered }).eq('id', method.id).select().single();
    setImprintMethods(imprintMethods.map(m => m.id === method.id ? data : m));
  }

  async function fetchStagesForMethod(method) {
    setSelectedMethod(method);
    const { data } = await supabase.from('production_stages').select('*').eq('method_id', method.id).order('sort_order');
    setProductionStages(data || []);
  }

  async function addStage() {
    if (!newStageName || !selectedMethod) return;
    const sortOrder = productionStages.length;
    const { data } = await supabase.from('production_stages').insert([{
      method_id: selectedMethod.id,
      name: newStageName,
      color: '#6b7280',
      requires_garment: false,
      embellishment_stage: false,
      sort_order: sortOrder,
    }]).select().single();
    setProductionStages([...productionStages, data]);
    setNewStageName('');
  }

  async function updateStage(stageId, field, value) {
    await supabase.from('production_stages').update({ [field]: value }).eq('id', stageId);
    setProductionStages(productionStages.map(s => s.id === stageId ? { ...s, [field]: value } : s));
  }

  async function deleteStage(stageId) {
    if (!confirm('Delete this stage?')) return;
    await supabase.from('production_stages').delete().eq('id', stageId);
    setProductionStages(productionStages.filter(s => s.id !== stageId));
  }

  async function moveStage(idx, dir) {
    const newStages = [...productionStages];
    const swap = idx + dir;
    if (swap < 0 || swap >= newStages.length) return;
    [newStages[idx], newStages[swap]] = [newStages[swap], newStages[idx]];
    newStages.forEach((s, i) => s.sort_order = i);
    setProductionStages(newStages);
    await Promise.all(newStages.map(s => supabase.from('production_stages').update({ sort_order: s.sort_order }).eq('id', s.id)));
  }

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', settings.id);
    if (error) { alert('Error saving: ' + error.message); }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    setSaving(false);
  }

  function updateSetting(key, value) {
    setSettings({ ...settings, [key]: value });
  }

  function toggleImprintMethod(method) {
    const current = settings.imprint_methods || [];
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    updateSetting('imprint_methods', updated);
  }

  if (checking || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Settings</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Manage your shop configuration</div>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              style={{ padding: '9px 20px', background: saved ? '#16a34a' : saving ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', transition: 'background .2s' }}
            >
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>

            {/* Settings Nav */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 0', height: 'fit-content' }}>
              {SECTIONS.map(section => (
                <div
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: activeSection === section.id ? '#2563eb' : '#374151', background: activeSection === section.id ? '#eff6ff' : 'transparent', borderLeft: activeSection === section.id ? '3px solid #2563eb' : '3px solid transparent', transition: 'all .15s' }}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </div>
              ))}
            </div>

            {/* Settings Content */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '24px' }}>

              {/* COMPANY INFO */}
              {activeSection === 'company' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Company Information</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>This information appears on quotes, invoices and emails sent to customers.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Shop Name *</label>
                      <input value={settings.shop_name || ''} onChange={e => updateSetting('shop_name', e.target.value)} placeholder="Blue Rocket" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Email Address *</label>
                      <input value={settings.shop_email || ''} onChange={e => updateSetting('shop_email', e.target.value)} placeholder="hello@bluerocket.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Phone Number</label>
                      <input value={settings.shop_phone || ''} onChange={e => updateSetting('shop_phone', e.target.value)} placeholder="+1 (615) 000-0000" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Website</label>
                      <input value={settings.shop_website || ''} onChange={e => updateSetting('shop_website', e.target.value)} placeholder="bluerocketwraps.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Street Address</label>
                    <input value={settings.shop_address || ''} onChange={e => updateSetting('shop_address', e.target.value)} placeholder="8018 Safari Drive" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>City</label>
                      <input value={settings.shop_city || ''} onChange={e => updateSetting('shop_city', e.target.value)} placeholder="Smyrna" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>State</label>
                      <input value={settings.shop_state || ''} onChange={e => updateSetting('shop_state', e.target.value)} placeholder="TN" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>ZIP Code</label>
                      <input value={settings.shop_zip || ''} onChange={e => updateSetting('shop_zip', e.target.value)} placeholder="37167" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Email Signature</label>
                    <textarea value={settings.email_signature || ''} onChange={e => updateSetting('email_signature', e.target.value)} placeholder="Thanks for your business!&#10;Blue Rocket Team&#10;hello@bluerocket.com" rows={4} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {/* QUOTES & INVOICES */}
              {activeSection === 'quotes' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Quotes & Invoices</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Configure default settings for quotes and invoices.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Quote Validity (days)</label>
                      <input type="number" value={settings.quote_validity_days || 30} onChange={e => updateSetting('quote_validity_days', parseInt(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>How long quotes remain valid</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Invoice Terms</label>
                      <select value={settings.invoice_terms || 'Net 30'} onChange={e => updateSetting('invoice_terms', e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}>
                        <option>Due on Receipt</option>
                        <option>Net 7</option>
                        <option>Net 15</option>
                        <option>Net 30</option>
                        <option>Net 60</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>Document Numbering</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Quote Prefix</label>
                        <input value={settings.quote_prefix || 'Q'} onChange={e => updateSetting('quote_prefix', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Next Quote #</label>
                        <input type="number" value={settings.next_quote_number || 1} onChange={e => updateSetting('next_quote_number', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={() => updateSetting('next_quote_number', 1)} style={{ width: '100%', padding: '8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Reset Quotes to 1</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Invoice Prefix</label>
                        <input value={settings.invoice_prefix || 'INV'} onChange={e => updateSetting('invoice_prefix', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Next Invoice #</label>
                        <input type="number" value={settings.next_invoice_number || 1} onChange={e => updateSetting('next_invoice_number', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={() => updateSetting('next_invoice_number', 1)} style={{ width: '100%', padding: '8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Reset Invoices to 1</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Order Prefix</label>
                        <input value={settings.order_prefix || 'ORD'} onChange={e => updateSetting('order_prefix', e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Next Order #</label>
                        <input type="number" value={settings.next_order_number || 1} onChange={e => updateSetting('next_order_number', parseInt(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={() => updateSetting('next_order_number', 1)} style={{ width: '100%', padding: '8px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>Reset Orders to 1</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Default Deposit %</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" min="0" max="100" value={settings.deposit_percentage || 50} onChange={e => updateSetting('deposit_percentage', parseInt(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>%</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Shown as deposit option in customer portal</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Tax Rate %</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" min="0" max="100" step="0.1" value={settings.tax_rate || 0} onChange={e => updateSetting('tax_rate', parseFloat(e.target.value))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>%</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Applied to quotes and invoices</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Quote Terms & Conditions</label>
                    <textarea value={settings.quote_terms || ''} onChange={e => updateSetting('quote_terms', e.target.value)} placeholder="e.g. Prices valid for 30 days. 50% deposit required to begin production. All sales final once production begins..." rows={5} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Appears at the bottom of all quotes</div>
                  </div>
                </div>
              )}

              {/* IMPRINT METHODS */}
              {activeSection === 'imprint' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Imprint Methods</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Manage the imprint methods your shop offers. Mark as Offered to enable them across the system.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {imprintMethods.map(method => (
                      <div key={method.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{method.name}</div>
                            {!method.offered && <div style={{ fontSize: '12px', color: '#9ca3af' }}>This method is not currently offered. Mark as Offered to configure.</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => toggleMethodOffered(method)}
                              style={{ padding: '5px 14px', background: method.offered ? '#2563eb' : 'white', color: method.offered ? 'white' : '#374151', border: '1px solid', borderColor: method.offered ? '#2563eb' : '#e5e7eb', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Offered
                            </button>
                            <button
                              onClick={() => toggleMethodOffered(method)}
                              style={{ padding: '5px 14px', background: !method.offered ? '#7c3aed' : 'white', color: !method.offered ? 'white' : '#374151', border: '1px solid', borderColor: !method.offered ? '#7c3aed' : '#e5e7eb', borderRadius: '100px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Not Offered
                            </button>
                            {method.offered && (
                              <button
                                onClick={() => { fetchStagesForMethod(method); setActiveSection('production'); }}
                                style={{ padding: '5px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}
                              >
                                ⚙ Configure
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMER PORTAL */}
              {activeSection === 'portal' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Customer Portal</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Customize what your customers see in their portal.</p>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Welcome Message</label>
                    <textarea value={settings.portal_welcome_message || ''} onChange={e => updateSetting('portal_welcome_message', e.target.value)} placeholder="Welcome to your Blue Rocket customer portal. Here you can view your quotes, track orders and make payments." rows={3} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                  </div>

                  <div style={{ background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Portal Features</div>
                    {[
                      { label: 'Allow customers to accept quotes', desc: 'Customers can approve quotes directly in the portal' },
                      { label: 'Allow customers to reject quotes', desc: 'Customers can reject quotes with a reason' },
                      { label: 'Show order progress bar', desc: 'Visual progress tracker on orders' },
                      { label: 'Allow online payments', desc: 'Customers can pay invoices via Stripe' },
                    ].map(feature => (
                      <div key={feature.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f1f3' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{feature.label}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{feature.desc}</div>
                        </div>
                        <div style={{ width: '38px', height: '22px', borderRadius: '100px', background: '#2563eb', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', background: 'white', right: '3px', top: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAYMENTS */}
              {activeSection === 'payments' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Payment Settings</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Configure payment options for your customers.</p>

                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>✓</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>Stripe Connected</div>
                      <div style={{ fontSize: '12px', color: '#16a34a' }}>Your Stripe account is connected and ready to accept payments</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Accept full payment', desc: 'Customers can pay the full invoice amount' },
                      { label: 'Accept deposit payments', desc: 'Customers can pay a percentage upfront' },
                      { label: 'Accept custom amounts', desc: 'Customers can enter a custom payment amount' },
                    ].map(option => (
                      <div key={option.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: '10px', background: 'white' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{option.label}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{option.desc}</div>
                        </div>
                        <div style={{ width: '38px', height: '22px', borderRadius: '100px', background: '#2563eb', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                          <div style={{ position: 'absolute', width: '16px', height: '16px', borderRadius: '50%', background: 'white', right: '3px', top: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>Go Live with Stripe</div>
                    <div style={{ fontSize: '12px', color: '#b45309', marginBottom: '12px' }}>You are currently in test mode. To accept real payments, activate your Stripe account and update your keys in Vercel.</div>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '8px 16px', background: '#f59e0b', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                      Activate Stripe Account
                    </a>
                  </div>
                </div>
              )}

              {/* PRODUCTION SETTINGS */}
              {activeSection === 'production' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Production Settings</h2>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Configure workflow stages for each decoration method.</p>

                  {/* Method selector */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {imprintMethods.filter(m => m.offered).map(method => (
                      <button
                        key={method.id}
                        onClick={() => fetchStagesForMethod(method)}
                        style={{ padding: '7px 16px', background: selectedMethod?.id === method.id ? '#111827' : 'white', color: selectedMethod?.id === method.id ? 'white' : '#374151', border: '1px solid', borderColor: selectedMethod?.id === method.id ? '#111827' : '#e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {method.name}
                      </button>
                    ))}
                    {imprintMethods.filter(m => m.offered).length === 0 && (
                      <div style={{ fontSize: '13px', color: '#9ca3af' }}>No methods marked as Offered. Go to Imprint Methods to enable them.</div>
                    )}
                  </div>

                  {selectedMethod ? (
                    <div>
                      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                        {/* Table header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 130px 160px 80px 60px', gap: '8px', padding: '10px 14px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                          <div></div>
                          <div>Stage Name</div>
                          <div>Color</div>
                          <div>Req. Garment</div>
                          <div>Embellishment</div>
                          <div>Depends On</div>
                          <div></div>
                        </div>

                        {/* Stage rows */}
                        {productionStages.map((stage, idx) => (
                          <div key={stage.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 130px 160px 80px 60px', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                            {/* Drag handle / reorder */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}>
                              <button onClick={() => moveStage(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#e5e7eb' : '#9ca3af', fontSize: '10px', padding: 0, lineHeight: 1 }}>▲</button>
                              <button onClick={() => moveStage(idx, 1)} disabled={idx === productionStages.length - 1} style={{ background: 'none', border: 'none', cursor: idx === productionStages.length - 1 ? 'default' : 'pointer', color: idx === productionStages.length - 1 ? '#e5e7eb' : '#9ca3af', fontSize: '10px', padding: 0, lineHeight: 1 }}>▼</button>
                            </div>

                            {/* Stage name with color badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: stage.color, color: 'white', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{stage.name}</span>
                              <input
                                value={stage.name}
                                onChange={e => updateStage(stage.id, 'name', e.target.value)}
                                style={{ flex: 1, padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                              />
                            </div>

                            {/* Color picker */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="color"
                                value={stage.color}
                                onChange={e => updateStage(stage.id, 'color', e.target.value)}
                                style={{ width: '32px', height: '28px', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
                              />
                              <select
                                value={stage.color}
                                onChange={e => updateStage(stage.id, 'color', e.target.value)}
                                style={{ flex: 1, padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', fontFamily: 'inherit' }}
                              >
                                {[['Blue','#3b82f6'],['Purple','#8b5cf6'],['Green','#10b981'],['Yellow','#f59e0b'],['Orange','#f97316'],['Red','#ef4444'],['Pink','#ec4899'],['Slate','#64748b'],['Indigo','#6366f1'],['Teal','#14b8a6']].map(([name, hex]) => (
                                  <option key={hex} value={hex}>{name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Requires Garment */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="checkbox"
                                checked={stage.requires_garment}
                                onChange={e => updateStage(stage.id, 'requires_garment', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '12px', color: '#374151' }}>Requires Garment</span>
                            </div>

                            {/* Embellishment Stage */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="checkbox"
                                checked={stage.embellishment_stage}
                                onChange={e => updateStage(stage.id, 'embellishment_stage', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '12px', color: '#374151' }}>Embellishment Stage</span>
                            </div>

                            {/* Depends On */}
                            <div>
                              <select
                                value={stage.depends_on || ''}
                                onChange={e => updateStage(stage.id, 'depends_on', e.target.value || null)}
                                style={{ width: '100%', padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', fontFamily: 'inherit' }}
                              >
                                <option value="">None</option>
                                {productionStages.filter(s => s.id !== stage.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Delete */}
                            <button onClick={() => deleteStage(stage.id)} style={{ padding: '4px 8px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                              Delete
                            </button>
                          </div>
                        ))}

                        {/* Add stage row */}
                        <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center', background: '#f8f9fb' }}>
                          <div style={{ width: '28px' }} />
                          <input
                            value={newStageName}
                            onChange={e => setNewStageName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addStage()}
                            placeholder="+ Add Stage name..."
                            style={{ flex: 1, padding: '7px 10px', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: 'white' }}
                          />
                          <button onClick={addStage} style={{ padding: '7px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Stage Flow Preview */}
                      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Stage Flow Preview</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {productionStages.map((stage, idx) => (
                            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ background: stage.color, color: 'white', padding: '5px 14px', borderRadius: '100px', fontSize: '12px', fontWeight: 700 }}>{stage.name}</span>
                              {idx < productionStages.length - 1 && <span style={{ color: '#9ca3af', fontSize: '16px' }}>→</span>}
                            </div>
                          ))}
                          {productionStages.length === 0 && <span style={{ fontSize: '13px', color: '#9ca3af' }}>No stages yet</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚙️</div>
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>Select an imprint method above to configure its stages</div>
                      <div style={{ fontSize: '12px' }}>Or go to Imprint Methods to mark methods as Offered</div>
                    </div>
                  )}
                </div>
              )}

              {/* GOOGLE WORKSPACE */}
              {activeSection === 'google' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Google Workspace</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Manage Google account connections for Gmail, Calendar and Drive.</p>

                  {/* Primary connection via Supabase OAuth (login) */}
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔑 Primary Account
                      <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '100px', fontWeight: 500 }}>Used for app login</span>
                    </div>
                    {supabaseSession?.provider_token || supabaseSession?.user?.app_metadata?.provider === 'google' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                            {(supabaseSession?.user?.email || '').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{supabaseSession?.user?.user_metadata?.full_name || supabaseSession?.user?.email}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{supabaseSession?.user?.email}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '3px 10px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Connected</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
                          style={{ padding: '7px 14px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>No Google account connected</div>
                        <button onClick={() => router.push('/login')} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Sign in with Google
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gmail/Calendar connection via NextAuth */}
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📧 Gmail & Calendar Access
                      <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '100px', fontWeight: 500 }}>Additional scopes</span>
                    </div>

                    {supabaseSession?.provider_token ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '3px 10px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                              <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Active via login</span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>Using token from Google sign-in</span>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          {[
                            { icon: '📧', label: 'Gmail', desc: 'Read & send emails' },
                            { icon: '📅', label: 'Calendar', desc: 'View & create events' },
                            { icon: '📁', label: 'Drive', desc: 'Store artwork files' },
                          ].map(s => (
                            <div key={s.label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '20px' }}>{s.icon}</span>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{s.label}</div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{s.desc}</div>
                              </div>
                              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', marginLeft: 'auto', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : googleStatus === 'authenticated' && googleSession?.accessToken ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{googleSession.user?.email}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '100px', padding: '3px 10px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                              <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Connected</span>
                            </div>
                          </div>
                          <button onClick={() => signOut({ redirect: false })} style={{ padding: '7px 14px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Disconnect
                          </button>
                        </div>
                        <button onClick={() => { signOut({ redirect: false }).then(() => signIn('google')); }} style={{ padding: '7px 14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          🔄 Reconnect to refresh token
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>Not connected — Gmail and Calendar won't work</div>
                        <button
                          onClick={() => signIn('google')}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 18 18">
                            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
                            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                          </svg>
                          Connect Google
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info box */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>How it works</div>
                    <div style={{ fontSize: '12px', color: '#b45309', lineHeight: 1.7 }}>
                      The Google account you sign in with is automatically used for Gmail, Calendar and Drive. If emails or calendar stop loading, use the reconnect button above to refresh your session.
                    </div>
                  </div>
                </div>
              )}

              {/* PRICING ENGINE */}
              {activeSection === 'pricing' && (
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Pricing Engine</h2>
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Manage materials, kits, and vehicle database for auto-pricing quotes.</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {[
                      { label: '🎨 Materials', desc: 'Vinyl, laminate, substrates, ink', path: '/pricing' },
                      { label: '📦 Kits', desc: 'Material combinations with pricing', path: '/pricing?tab=kits' },
                      { label: '🚗 Vehicles', desc: 'Vehicle sq/ft database', path: '/pricing?tab=vehicles' },
                    ].map(item => (
                      <div key={item.label} onClick={() => router.push(item.path)} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', cursor: 'pointer', flex: '1', minWidth: '180px' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                      >
                        <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.label.split(' ')[0]}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{item.label.split(' ').slice(1).join(' ')}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>How it works</div>
                    <div style={{ fontSize: '12px', color: '#b45309', lineHeight: 1.8 }}>
                      1. Add your <strong>Materials</strong> (vinyl, laminate, substrate) with cost per sqft<br/>
                      2. Build <strong>Kits</strong> by combining materials — set your margin and waste factor<br/>
                      3. Add <strong>Vehicles</strong> with their square footage data<br/>
                      4. When building a quote, select a vehicle + kit → price is calculated automatically
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading...</div>}><SettingsPageInner /></Suspense>;
}
