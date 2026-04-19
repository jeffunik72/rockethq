'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SECTIONS = [
  { id: 'company', label: 'Company Info', icon: '🏢' },
  { id: 'quotes', label: 'Quotes & Invoices', icon: '📄' },
  { id: 'imprint', label: 'Imprint Methods', icon: '🖨' },
  { id: 'portal', label: 'Customer Portal', icon: '🔗' },
  { id: 'payments', label: 'Payments', icon: '💳' },
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

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('company');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchSettings(); }
    });
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
    setLoading(false);
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
                  <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Select the imprint methods your shop offers. These will be available when creating quotes and production jobs.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                    {IMPRINT_METHODS.map(method => {
                      const isActive = (settings.imprint_methods || []).includes(method);
                      return (
                        <div
                          key={method}
                          onClick={() => toggleImprintMethod(method)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `2px solid ${isActive ? '#2563eb' : '#e5e7eb'}`, borderRadius: '10px', cursor: 'pointer', background: isActive ? '#eff6ff' : 'white', transition: 'all .15s' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isActive ? '#2563eb' : '#d1d5db'}`, background: isActive ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isActive && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, color: isActive ? '#1d4ed8' : '#374151' }}>{method}</span>
                          </div>
                          {isActive && <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>Active</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>Active Methods: {(settings.imprint_methods || []).join(', ') || 'None selected'}</div>
                    <div style={{ fontSize: '12px', color: '#b45309' }}>These will appear as options when building quotes and creating production jobs</div>
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

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
