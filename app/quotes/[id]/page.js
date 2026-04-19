'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const ITEM_TYPES = [
  { id: 'apparel', label: 'Apparel', icon: '👕', desc: 'T-shirts, hoodies, hats, polos' },
  { id: 'large_format', label: 'Large Format', icon: '🖼', desc: 'Banners, signs, backdrops' },
  { id: 'vehicle_wrap', label: 'Vehicle Wrap', icon: '🚗', desc: 'Full wrap, partial, decals' },
  { id: 'promo', label: 'Promo Product', icon: '📦', desc: 'Pens, bags, drinkware' },
  { id: 'custom', label: 'Custom', icon: '✏️', desc: 'Anything else' },
];

const IMPRINT_LOCATIONS = ['Left Chest', 'Full Front', 'Full Back', 'Right Chest', 'Left Sleeve', 'Right Sleeve', 'Hood', 'Nape', 'Hat Front', 'Hat Side', 'Custom'];
const WRAP_TYPES = ['Full Wrap', 'Partial Wrap', 'Decal', 'Perforated Window', 'Hood Wrap', 'Roof Wrap'];
const GARMENT_STATUSES = ['Not Ordered', 'Ordered', 'In Transit', 'Received'];

function newItem(type) {
  return {
    item_type: type,
    description: '',
    category: type,
    brand: '',
    style_number: '',
    color: '',
    size_xs: 0, size_s: 0, size_m: 0, size_l: 0, size_xl: 0, size_2xl: 0, size_3xl: 0, size_4xl: 0,
    width: '', height: '', material: '',
    vehicle_year: '', vehicle_make: '', vehicle_model: '', wrap_type: '',
    quantity: 1, unit_price: 0, total: 0,
    garment_status: 'Not Ordered', taxed: false,
    imprint_method: '', imprint_location: '', imprint_colors: 1, imprint_notes: '',
  };
}

export default function QuoteDetailPage({ params }) {
  const { id } = use(params);
  const [quote, setQuote] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [imprintMethods, setImprintMethods] = useState(['Embroidery', 'Screen Printing', 'DTG', 'DTF', 'Heat Press', 'Vinyl', 'Sublimation']);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchQuote();
    });
  }, [id]);

  async function fetchQuote() {
    const { data: quoteData } = await supabase.from('quotes').select('*, customers(*)').eq('id', id).single();
    if (!quoteData) { router.push('/quotes'); return; }
    setQuote(quoteData);
    setCustomer(quoteData.customers);
    const { data: itemsData } = await supabase.from('quote_items').select('*').eq('quote_id', id);
    setItems(itemsData || []);
    // Don't auto-enable edit mode
    const { data: settingsData } = await supabase.from('settings').select('*').single();
    const { data: staffData } = await supabase.from('staff').select('*').eq('active', true);
    const { data: customersData } = await supabase.from('customers').select('id, name, company, email, phone');
    if (staffData) setStaff(staffData);
    if (settingsData) setSettings(settingsData);
    if (customersData) setAllCustomers(customersData);
    if (settingsData?.imprint_methods?.length > 0) setImprintMethods(settingsData.imprint_methods);
    setLoading(false);
  }

  async function createCustomer() {
    if (!newCustomerForm.name) { alert('Name is required'); return; }
    const token = crypto.randomUUID();
    const { data: cust, error } = await supabase.from('customers').insert([{
      ...newCustomerForm,
      portal_token: token,
      portal_enabled: true,
    }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    await supabase.from('quotes').update({ customer_id: cust.id }).eq('id', id);
    setCustomer(cust);
    setQuote({ ...quote, customer_id: cust.id });
    setAllCustomers([...allCustomers, cust]);
    setShowCustomerModal(false);
    setNewCustomerForm({ name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });
  }

  async function assignCustomer(cust) {
    await supabase.from('quotes').update({ customer_id: cust.id }).eq('id', id);
    setCustomer(cust);
    setQuote({ ...quote, customer_id: cust.id });
    setShowCustomerSearch(false);
    setCustomerSearch('');
  }

  function addItem(type) {
    setItems([...items, newItem(type)]);
    setShowTypeModal(false);
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index][field] = value;
    if (['size_xs','size_s','size_m','size_l','size_xl','size_2xl','size_3xl','size_4xl'].includes(field)) {
      const sizes = ['size_xs','size_s','size_m','size_l','size_xl','size_2xl','size_3xl','size_4xl'];
      const totalQty = sizes.reduce((s, k) => s + (parseInt(updated[index][k]) || 0), 0);
      updated[index].quantity = totalQty;
      updated[index].total = totalQty * (parseFloat(updated[index].unit_price) || 0);
    } else if (field === 'unit_price') {
      updated[index].total = (parseFloat(value) || 0) * (parseFloat(updated[index].quantity) || 0);
    } else if (field === 'quantity') {
      updated[index].total = (parseFloat(value) || 0) * (parseFloat(updated[index].unit_price) || 0);
    }
    setItems(updated);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  function getSubtotal() { return items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0); }
  function getTaxAmount() { return items.filter(i => i.taxed).reduce((s, i) => s + (parseFloat(i.total) || 0), 0) * ((quote?.tax_rate || 0) / 100); }
  function getTotal() { return getSubtotal() + (parseFloat(quote?.shipping_cost) || 0) - (parseFloat(quote?.discount) || 0) + getTaxAmount(); }

  async function saveItems() {
    setSaving(true);
    const total = getTotal();
    await supabase.from('quote_items').delete().eq('quote_id', id);
    if (items.length > 0) {
      const newItems = items.map(item => ({ ...item, quote_id: id }));
      await supabase.from('quote_items').insert(newItems);
    }
    await supabase.from('quotes').update({ total }).eq('id', id);
    setQuote({ ...quote, total });
    setSaving(false);
    setEditMode(false);
    await fetchQuote();
  }

  async function updateQuoteField(field, value) {
    await supabase.from('quotes').update({ [field]: value }).eq('id', id);
    setQuote({ ...quote, [field]: value });
  }

  async function updateStatus(status) {
    await supabase.from('quotes').update({ status }).eq('id', id);
    setQuote({ ...quote, status });
  }

  async function sendQuote() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    setSending(true);
    const res = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: { ...quote, quote_number: (quote.quote_number ? 'Q-' + String(quote.quote_number).padStart(4, '0') : 'Q-' + id.slice(0,8).toUpperCase()) },
        customer,
        items,
      }),
    });
    const result = await res.json();
    if (result.success) { await updateStatus('Sent'); alert('Quote sent to ' + customer.email + '!'); }
    else { alert('Error: ' + JSON.stringify(result.error)); }
    setSending(false);
  }

  const statusColors = {
    'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
    'Sent': { bg: '#fef3c7', color: '#b45309' },
    'Accepted': { bg: '#dcfce7', color: '#15803d' },
    'Ordered': { bg: '#ede9fe', color: '#5b21b6' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const sc = statusColors[quote.status] || statusColors['New Quote'];
  const isEditable = quote.status === 'New Quote';
  const subtotal = getSubtotal();
  const taxAmount = getTaxAmount();
  const total = getTotal();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f8f9fb' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => router.push('/quotes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                Back to Quotes
              </button>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>
                {settings?.quote_prefix || 'Q'}-{String(quote.quote_number || '').padStart(4, '0')}
              </h1>
              <select
                value={quote.status}
                onChange={e => updateStatus(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid', borderColor: sc.color, borderRadius: '7px', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', background: sc.bg, color: sc.color, cursor: 'pointer', outline: 'none' }}
              >
                {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} style={{ padding: '8px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  Edit Quote
                </button>
              ) : (
                <button onClick={saveItems} disabled={saving} style={{ padding: '8px 14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : 'Save Quote'}
                </button>
              )}
              <button onClick={sendQuote} disabled={sending || items.length === 0} style={{ padding: '8px 14px', background: sending || items.length === 0 ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                {sending ? 'Sending...' : 'Send to Customer'}
              </button>
            </div>
          </div>

          {/* Quote Header — condensed */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
              {/* Customer */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Customer</div>
                {editMode ? (
                  <div>
                    {customer ? (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{customer.name}</div>
                        {customer.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.company}</div>}
                        {customer.email && <div style={{ fontSize: '12px', color: '#2563eb' }}>{customer.email}</div>}
                        <button onClick={() => setCustomer(null)} style={{ fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}>Change customer</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          onClick={() => setShowCustomerSearch(true)}
                          style={{ padding: '7px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                        >
                          Search Existing Customer
                        </button>
                        <button
                          onClick={() => setShowCustomerModal(true)}
                          style={{ padding: '7px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                        >
                          + Create New Customer
                        </button>
                      </div>
                    )}
                    {showCustomerSearch && (
                      <div style={{ position: 'relative' }}>
                        <input
                          autoFocus
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          placeholder="Search by name or company..."
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }}
                        />
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                          {allCustomers.filter(c => 
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                            (c.company && c.company.toLowerCase().includes(customerSearch.toLowerCase()))
                          ).map(c => (
                            <div key={c.id} onClick={() => assignCustomer(c)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              {c.company && <div style={{ fontSize: '11px', color: '#6b7280' }}>{c.company}</div>}
                            </div>
                          ))}
                          {allCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No customers found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : customer ? (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{customer.name}</div>
                    {customer.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.company}</div>}
                    {customer.email && <div style={{ fontSize: '12px', color: '#2563eb' }}>{customer.email}</div>}
                    {customer.phone && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.phone}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No customer — click Edit to assign one</div>
                )}
              </div>

              {/* Dates */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Dates</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Created:</span>
                    <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Payment Due:</span>
                    {editMode ? (
                      <input type="date" value={quote.due_date || ''} onChange={e => updateQuoteField('due_date', e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit' }} />
                    ) : <span>{quote.due_date || '—'}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Production Due:</span>
                    {editMode ? (
                      <input type="date" value={quote.production_due_date || ''} onChange={e => updateQuoteField('production_due_date', e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit' }} />
                    ) : <span>{quote.production_due_date || '—'}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Customer Due:</span>
                    {editMode ? (
                      <input type="date" value={quote.customer_due_date || ''} onChange={e => updateQuoteField('customer_due_date', e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit' }} />
                    ) : <span>{quote.customer_due_date || '—'}</span>}
                  </div>
                </div>
              </div>

              {/* Sales Rep + Status */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Sales Rep:</span>
                    {editMode ? (
                      <select value={quote.sales_rep || ''} onChange={e => updateQuoteField('sales_rep', e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit', maxWidth: '120px' }}>
                        <option value="">Select rep...</option>
                        {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    ) : <span>{quote.sales_rep || '—'}</span>}
                  </div>

                </div>
              </div>

              {/* Shipping */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Shipping</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Shipping Cost:</span>
                    {editMode ? (
                      <input type="number" value={quote.shipping_cost || 0} onChange={e => updateQuoteField('shipping_cost', parseFloat(e.target.value) || 0)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit', width: '70px', textAlign: 'right' }} />
                    ) : <span>${(quote.shipping_cost || 0).toFixed(2)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Discount:</span>
                    {editMode ? (
                      <input type="number" value={quote.discount || 0} onChange={e => updateQuoteField('discount', parseFloat(e.target.value) || 0)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit', width: '70px', textAlign: 'right' }} />
                    ) : <span>-${(quote.discount || 0).toFixed(2)}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', fontStyle: 'italic' }}>
                    Tracking info coming soon
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Quote Items</div>
              {editMode && (
                <button onClick={() => setShowTypeModal(true)} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Add Item
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div style={{ fontSize: '14px' }}>No items yet — click Add Item to get started</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Item Header */}
                    <div style={{ background: '#f8f9fb', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{ITEM_TYPES.find(t => t.id === item.item_type)?.icon || '📦'}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>{ITEM_TYPES.find(t => t.id === item.item_type)?.label || 'Item'} {idx + 1}</span>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginLeft: '8px' }}>${(item.total || 0).toFixed(2)}</span>
                      </div>
                      {editMode && (
                        <span onClick={() => removeItem(idx)} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '18px' }}>x</span>
                      )}
                    </div>

                    <div style={{ padding: '14px' }}>
                      {/* APPAREL */}
                      {item.item_type === 'apparel' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                              {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Product name" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>STYLE #</div>
                              {editMode ? <input value={item.style_number} onChange={e => updateItem(idx, 'style_number', e.target.value)} placeholder="e.g. 64000" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.style_number || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>COLOR</div>
                              {editMode ? <input value={item.color} onChange={e => updateItem(idx, 'color', e.target.value)} placeholder="e.g. Navy" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.color || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>UNIT PRICE</div>
                              {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                            </div>
                          </div>

                          {/* Size Grid */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>SIZES</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                              {['xs','s','m','l','xl','2xl','3xl','4xl'].map(size => (
                                <div key={size} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '3px', textTransform: 'uppercase' }}>{size}</div>
                                  {editMode ? (
                                    <input
                                      type="number"
                                      min="0"
                                      value={item['size_' + size] || 0}
                                      onChange={e => updateItem(idx, 'size_' + size, parseInt(e.target.value) || 0)}
                                      style={{ width: '100%', padding: '5px 2px', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                                    />
                                  ) : (
                                    <div style={{ padding: '5px', background: item['size_' + size] > 0 ? '#eff6ff' : '#f9fafb', border: '1px solid', borderColor: item['size_' + size] > 0 ? '#bfdbfe' : '#e5e7eb', borderRadius: '5px', fontSize: '13px', fontWeight: item['size_' + size] > 0 ? 700 : 400, color: item['size_' + size] > 0 ? '#1d4ed8' : '#9ca3af' }}>
                                      {item['size_' + size] || 0}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>TOTAL QTY</div>
                              <div style={{ fontSize: '14px', fontWeight: 700 }}>{item.quantity || 0}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>GARMENT STATUS</div>
                              {editMode ? (
                                <select value={item.garment_status} onChange={e => updateItem(idx, 'garment_status', e.target.value)} style={{ width: '100%', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  {GARMENT_STATUSES.map(s => <option key={s}>{s}</option>)}
                                </select>
                              ) : <span style={{ fontSize: '12px', background: '#f3f4f6', padding: '3px 8px', borderRadius: '100px' }}>{item.garment_status}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
                              <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} style={{ width: '14px', height: '14px' }} />
                              <span style={{ fontSize: '12px', color: '#374151' }}>Taxed</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LARGE FORMAT */}
                      {item.item_type === 'large_format' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                              {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="e.g. 4x8 Banner" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>WIDTH (ft)</div>
                              {editMode ? <input type="number" value={item.width || ''} onChange={e => updateItem(idx, 'width', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.width || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>HEIGHT (ft)</div>
                              {editMode ? <input type="number" value={item.height || ''} onChange={e => updateItem(idx, 'height', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.height || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>QTY</div>
                              {editMode ? <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.quantity}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>UNIT PRICE</div>
                              {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>MATERIAL/SUBSTRATE</div>
                              {editMode ? <input value={item.material || ''} onChange={e => updateItem(idx, 'material', e.target.value)} placeholder="e.g. 13oz Vinyl, Coroplast" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.material || '—'}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
                              <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} style={{ width: '14px', height: '14px' }} />
                              <span style={{ fontSize: '12px', color: '#374151' }}>Taxed</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VEHICLE WRAP */}
                      {item.item_type === 'vehicle_wrap' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>YEAR</div>
                              {editMode ? <input value={item.vehicle_year || ''} onChange={e => updateItem(idx, 'vehicle_year', e.target.value)} placeholder="2024" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.vehicle_year || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>MAKE</div>
                              {editMode ? <input value={item.vehicle_make || ''} onChange={e => updateItem(idx, 'vehicle_make', e.target.value)} placeholder="Ford" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.vehicle_make || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>MODEL</div>
                              {editMode ? <input value={item.vehicle_model || ''} onChange={e => updateItem(idx, 'vehicle_model', e.target.value)} placeholder="F-150" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.vehicle_model || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>WRAP TYPE</div>
                              {editMode ? (
                                <select value={item.wrap_type || ''} onChange={e => updateItem(idx, 'wrap_type', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {WRAP_TYPES.map(w => <option key={w}>{w}</option>)}
                                </select>
                              ) : <div style={{ fontSize: '13px' }}>{item.wrap_type || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>PRICE</div>
                              {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION / NOTES</div>
                            {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Additional details..." style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                            : <div style={{ fontSize: '13px' }}>{item.description || '—'}</div>}
                          </div>
                        </div>
                      )}

                      {/* PROMO PRODUCT */}
                      {item.item_type === 'promo' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                              {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="e.g. Custom Tote Bag" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>STYLE #</div>
                              {editMode ? <input value={item.style_number || ''} onChange={e => updateItem(idx, 'style_number', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.style_number || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>COLOR</div>
                              {editMode ? <input value={item.color || ''} onChange={e => updateItem(idx, 'color', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.color || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>QTY</div>
                              {editMode ? <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.quantity}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>UNIT PRICE</div>
                              {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontSize: '12px', color: '#374151' }}>Taxed</span>
                          </div>
                        </div>
                      )}

                      {/* CUSTOM */}
                      {item.item_type === 'custom' && (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                              {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>QTY</div>
                              {editMode ? <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.quantity}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>UNIT PRICE</div>
                              {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px', fontWeight: 600 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} style={{ width: '14px', height: '14px' }} />
                            <span style={{ fontSize: '12px', color: '#374151' }}>Taxed</span>
                          </div>
                        </div>
                      )}

                      {/* Imprint Details — shown for apparel, promo, custom */}
                      {['apparel', 'promo', 'custom'].includes(item.item_type) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Imprint Details</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>METHOD</div>
                              {editMode ? (
                                <select value={item.imprint_method || ''} onChange={e => updateItem(idx, 'imprint_method', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {imprintMethods.map(m => <option key={m}>{m}</option>)}
                                </select>
                              ) : <div style={{ fontSize: '13px' }}>{item.imprint_method || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>LOCATION</div>
                              {editMode ? (
                                <select value={item.imprint_location || ''} onChange={e => updateItem(idx, 'imprint_location', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {IMPRINT_LOCATIONS.map(l => <option key={l}>{l}</option>)}
                                </select>
                              ) : <div style={{ fontSize: '13px' }}>{item.imprint_location || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>COLORS/THREADS</div>
                              {editMode ? <input type="number" min="1" value={item.imprint_colors || 1} onChange={e => updateItem(idx, 'imprint_colors', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.imprint_colors || '—'}</div>}
                            </div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>NOTES</div>
                              {editMode ? <input value={item.imprint_notes || ''} onChange={e => updateItem(idx, 'imprint_notes', e.target.value)} placeholder="Additional notes..." style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                              : <div style={{ fontSize: '13px' }}>{item.imprint_notes || '—'}</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Order Summary */}
            {items.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '280px', background: '#f8f9fb', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '10px' }}>ORDER SUMMARY</div>
                  {[
                    ['Item Total', '$' + subtotal.toFixed(2)],
                    ['Shipping', '$' + (parseFloat(quote.shipping_cost) || 0).toFixed(2)],
                    ['Discount', '-$' + (parseFloat(quote.discount) || 0).toFixed(2)],
                    ['Sales Tax', '$' + taxAmount.toFixed(2)],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ color: '#6b7280' }}>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, padding: '10px 0 0' }}>
                    <span>Order Total</span>
                    <span style={{ color: '#111827' }}>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>CUSTOMER NOTES</div>
              {editMode ? (
                <textarea value={quote.customer_notes || ''} onChange={e => updateQuoteField('customer_notes', e.target.value)} rows={3} placeholder="Notes visible to customer..." style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              ) : (
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{quote.customer_notes || 'No customer notes'}</div>
              )}
            </div>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>PRODUCTION NOTES</div>
              {editMode ? (
                <textarea value={quote.production_notes || ''} onChange={e => updateQuoteField('production_notes', e.target.value)} rows={3} placeholder="Internal production notes..." style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              ) : (
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{quote.production_notes || 'No production notes'}</div>
              )}
            </div>
          </div>

          {/* Portal Link */}
          {customer?.portal_token && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Customer Portal Link</div>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/portal/' + customer.portal_token); alert('Portal link copied!'); }} style={{ padding: '6px 14px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
                Copy Link
              </button>
            </div>
          )}

        </main>
      </div>

      {/* NEW CUSTOMER MODAL */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>New Customer</h2>
              <span onClick={() => setShowCustomerModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Full Name *</label>
                  <input value={newCustomerForm.name} onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})} placeholder="Jane Smith" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={newCustomerForm.company} onChange={e => setNewCustomerForm({...newCustomerForm, company: e.target.value})} placeholder="Acme Co." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm({...newCustomerForm, email: e.target.value})} placeholder="jane@example.com" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} placeholder="(615) 000-0000" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Address</label>
                <input value={newCustomerForm.address} onChange={e => setNewCustomerForm({...newCustomerForm, address: e.target.value})} placeholder="123 Main St" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>City</label>
                  <input value={newCustomerForm.city} onChange={e => setNewCustomerForm({...newCustomerForm, city: e.target.value})} placeholder="Nashville" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>State</label>
                  <input value={newCustomerForm.state} onChange={e => setNewCustomerForm({...newCustomerForm, state: e.target.value})} placeholder="TN" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>ZIP</label>
                  <input value={newCustomerForm.zip} onChange={e => setNewCustomerForm({...newCustomerForm, zip: e.target.value})} placeholder="37188" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button onClick={() => setShowCustomerModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={createCustomer} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Create Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ITEM TYPE MODAL */}
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>What type of item?</h2>
              <span onClick={() => setShowTypeModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ITEM_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => addItem(type.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f8f9fb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >
                  <span style={{ fontSize: '28px' }}>{type.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{type.label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{type.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
