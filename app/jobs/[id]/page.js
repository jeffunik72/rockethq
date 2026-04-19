'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';

const STATUS_COLORS = {
  'New Quote': { bg: '#dbeafe', color: '#1d4ed8' },
  'Quote Sent': { bg: '#fef3c7', color: '#b45309' },
  'Accepted': { bg: '#dcfce7', color: '#15803d' },
  'Awaiting Payment': { bg: '#fee2e2', color: '#b91c1c' },
  'In Production': { bg: '#ede9fe', color: '#5b21b6' },
  'Ready for Pickup': { bg: '#d1fae5', color: '#065f46' },
  'Delivered': { bg: '#f3f4f6', color: '#4b5563' },
  'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
};

const ITEM_TYPES = [
  { id: 'apparel', label: 'Apparel', icon: '👕', desc: 'T-shirts, hoodies, hats, polos' },
  { id: 'large_format', label: 'Large Format', icon: '🖼', desc: 'Banners, signs, backdrops' },
  { id: 'vehicle_wrap', label: 'Vehicle Wrap', icon: '🚗', desc: 'Full wrap, partial, decals' },
  { id: 'promo', label: 'Promo Product', icon: '📦', desc: 'Pens, bags, drinkware' },
  { id: 'custom', label: 'Custom', icon: '✏️', desc: 'Anything else' },
];

const IMPRINT_LOCATIONS = ['Left Chest', 'Full Front', 'Full Back', 'Right Chest', 'Left Sleeve', 'Right Sleeve', 'Hood', 'Nape', 'Hat Front', 'Hat Side', 'Custom'];
const GARMENT_STATUSES = ['Not Ordered', 'Ordered', 'In Transit', 'Received'];
const WRAP_TYPES = ['Full Wrap', 'Partial Wrap', 'Decal', 'Perforated Window', 'Hood Wrap', 'Roof Wrap'];

function newItem(type) {
  return {
    item_type: type, description: '', category: type, brand: '', style_number: '', color: '', kit_id: '',
    size_xs: 0, size_s: 0, size_m: 0, size_l: 0, size_xl: 0, size_2xl: 0, size_3xl: 0, size_4xl: 0,
    width: '', height: '', material: '', vehicle_year: '', vehicle_make: '', vehicle_model: '', wrap_type: '',
    quantity: 1, unit_price: 0, total: 0, garment_status: 'Not Ordered', taxed: false,
    imprint_method: '', imprint_location: '', imprint_colors: 1, imprint_notes: '',
  };
}

export default function JobDetailPage({ params }) {
  const { id } = use(params);
  const [job, setJob] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [kits, setKits] = useState([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleSearch, setShowVehicleSearch] = useState(null); // item idx
  const [selectedKits, setSelectedKits] = useState({}); // idx -> kit_id
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState([]);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState(null);
  const [imprintMethods, setImprintMethods] = useState(['Embroidery', 'Screen Printing', 'DTG', 'DTF', 'Heat Press', 'Vinyl']);
  const [activeTab, setActiveTab] = useState('items');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else fetchJob();
    });
  }, [id]);

  async function fetchJob() {
    const { data: jobData } = await supabase.from('jobs').select('*, customers(*)').eq('id', id).single();
    if (!jobData) { router.push('/jobs'); return; }
    setJob(jobData);
    setCustomer(jobData.customers);

    const { data: itemsData } = await supabase.from('job_items').select('*').eq('job_id', id);
    setItems(itemsData || []);

    const [{ data: staffData }, { data: settingsData }, { data: customersData }, { data: vehiclesData }, { data: kitsData }] = await Promise.all([
      supabase.from('staff').select('*').eq('active', true),
      supabase.from('settings').select('*').single(),
      supabase.from('customers').select('id, name, company, email, phone'),
      supabase.from('vehicles').select('*').order('make').order('model').order('year', { ascending: false }),
      supabase.from('material_kits').select('*, kit_materials(*, materials(*))').eq('active', true).order('name'),
    ]);
    if (vehiclesData) setVehicles(vehiclesData);
    if (kitsData) setKits(kitsData);

    if (staffData) setStaff(staffData);
    if (settingsData) {
      setSettings(settingsData);
      if (settingsData.imprint_methods?.length > 0) setImprintMethods(settingsData.imprint_methods);
    }
    if (customersData) setAllCustomers(customersData);
    setLoading(false);
  }

  function addItem(type) { setItems([...items, newItem(type)]); setShowTypeModal(false); }

  function getKitSellPrice(kit, sqft) {
    if (!kit || !sqft) return 0;
    const matCost = (kit.kit_materials || []).reduce((s, km) => s + ((km.materials?.cost_per_sqft || 0) * (km.quantity_per_sqft || 1)), 0);
    const withWaste = matCost * (1 + (kit.waste_factor || 0) / 100);
    const totalCost = (withWaste + (kit.install_cost_sqft || 0)) * sqft;
    return totalCost / (1 - (kit.target_margin || 40) / 100);
  }

  function applyVehicleKit(idx, vehicle, wrapType, kit) {
    if (!vehicle || !kit) { alert('Vehicle not found in database. Add it in Settings → Pricing → Vehicles'); return; }
    const sqftMap = {
      'Full Wrap': vehicle.full_wrap_sqft,
      'Partial Wrap': vehicle.partial_wrap_sqft,
      'Hood Wrap': vehicle.hood_sqft,
      'Roof Wrap': vehicle.roof_sqft,
      'Tailgate Wrap': vehicle.tailgate_sqft,
      'Door Wrap': vehicle.doors_sqft,
    };
    const sqft = sqftMap[wrapType] || vehicle.full_wrap_sqft || 0;
    const price = getKitSellPrice(kit, sqft);
    const unitPrice = parseFloat(price.toFixed(2));
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        vehicle_year: String(vehicle.year),
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        wrap_type: wrapType,
        width: sqft,
        description: vehicle.year + ' ' + vehicle.make + ' ' + vehicle.model + ' - ' + wrapType,
        unit_price: unitPrice,
        quantity: 1,
        total: unitPrice,
      };
      return updated;
    });
    setShowVehicleSearch(null);
    setVehicleSearch('');
  }

  function applyLargeFormatKit(idx, kit, sqft, width, height, qty) {
    if (!kit || !sqft) return;
    const totalPrice = getKitSellPrice(kit, sqft);
    const unitPrice = parseFloat((totalPrice / (qty || 1)).toFixed(2));
    const totalFinal = parseFloat((unitPrice * (qty || 1)).toFixed(2));
    setItems(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        width: width,
        height: height,
        quantity: qty || 1,
        material: kit.name,
        description: updated[idx].description || (width + 'ft x ' + height + 'ft ' + kit.name),
        unit_price: unitPrice,
        total: totalFinal,
      };
      return updated;
    });
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

  function removeItem(index) { setItems(items.filter((_, i) => i !== index)); }

  function getSubtotal() { return items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0); }
  function getTotal() { return getSubtotal() + (parseFloat(job?.shipping_cost) || 0) - (parseFloat(job?.discount) || 0); }

  async function saveJob() {
    setSaving(true);
    const total = getTotal();
    const amountDue = Math.max(0, total - (job.amount_paid || 0));

    await supabase.from('job_items').delete().eq('job_id', id);
    if (items.length > 0) {
      await supabase.from('job_items').insert(items.map(item => ({ ...item, job_id: id })));
    }
    await supabase.from('jobs').update({ total, amount_due: amountDue, updated_at: new Date().toISOString() }).eq('id', id);
    setJob({ ...job, total, amount_due: amountDue });
    setSaving(false);
    setEditMode(false);
  }

  async function updateJobField(field, value) {
    await supabase.from('jobs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    setJob({ ...job, [field]: value });
  }

  async function updateStatus(status) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'Quote Sent') updates.quote_sent_at = new Date().toISOString();
    if (status === 'Accepted') updates.accepted_at = new Date().toISOString();
    await supabase.from('jobs').update(updates).eq('id', id);
    setJob({ ...job, ...updates });
  }

  async function sendQuoteEmail() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    setSending(true);
    const jobNum = (settings?.quote_prefix || 'J') + '-' + String(job.job_number || '').padStart(4, '0');
    const res = await fetch('/api/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote: { ...job, quote_number: jobNum, notes: job.notes },
        customer,
        items,
      }),
    });
    const result = await res.json();
    if (result.success) {
      await updateStatus('Quote Sent');
      alert('Quote sent to ' + customer.email + '!');
    } else {
      alert('Error: ' + JSON.stringify(result.error));
    }
    setSending(false);
  }

  async function sendInvoiceEmail() {
    if (!customer?.email) { alert('Customer has no email address'); return; }
    setSending(true);
    const res = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice: { id: job.id, amount_total: job.total, amount_paid: job.amount_paid || 0, amount_due: job.amount_due || job.total, status: job.payment_status, invoice_number: job.job_number },
        customer,
        order: job,
      }),
    });
    const result = await res.json();
    if (result.success) { alert('Invoice sent to ' + customer.email + '!'); }
    else { alert('Error sending invoice'); }
    setSending(false);
  }

  async function deleteJob() {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    await supabase.from('job_items').delete().eq('job_id', id);
    await supabase.from('jobs').delete().eq('id', id);
    router.push('/jobs');
  }

  async function createCustomer() {
    if (!newCustomerForm.name) { alert('Name is required'); return; }
    const token = crypto.randomUUID();
    const { data: cust, error } = await supabase.from('customers').insert([{ ...newCustomerForm, portal_token: token, portal_enabled: true }]).select().single();
    if (error) { alert('Error: ' + error.message); return; }
    await supabase.from('jobs').update({ customer_id: cust.id }).eq('id', id);
    setCustomer(cust);
    setJob({ ...job, customer_id: cust.id });
    setAllCustomers([...allCustomers, cust]);
    setShowCustomerModal(false);
    setNewCustomerForm({ name: '', company: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });
  }

  async function assignCustomer(cust) {
    await supabase.from('jobs').update({ customer_id: cust.id }).eq('id', id);
    setCustomer(cust);
    setJob({ ...job, customer_id: cust.id });
    setShowCustomerSearch(false);
    setCustomerSearch('');
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>;

  const sc = STATUS_COLORS[job.status] || STATUS_COLORS['New Quote'];
  const prefix = settings?.quote_prefix || 'J';
  const jobNum = prefix + '-' + String(job.job_number || '').padStart(4, '0');
  const subtotal = getSubtotal();
  const total = getTotal();
  const isQuoteStage = ['New Quote', 'Quote Sent'].includes(job.status);
  const isInvoiceStage = ['Accepted', 'Awaiting Payment', 'In Production', 'Ready for Pickup', 'Delivered'].includes(job.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#f8f9fb' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => router.push('/jobs')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
                Back to Jobs
              </button>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{jobNum}</h1>
              <select
                value={job.status}
                onChange={e => updateStatus(e.target.value)}
                style={{ padding: '5px 10px', border: '1px solid', borderColor: sc.color, borderRadius: '7px', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', background: sc.bg, color: sc.color, cursor: 'pointer', outline: 'none' }}
              >
                {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!editMode ? (
                <button onClick={() => setEditMode(true)} style={{ padding: '7px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Edit</button>
              ) : (
                <button onClick={saveJob} disabled={saving} style={{ padding: '7px 14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              {isQuoteStage && (
                <button onClick={sendQuoteEmail} disabled={sending} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {sending ? 'Sending...' : 'Send Quote'}
                </button>
              )}
              {isInvoiceStage && (
                <button onClick={sendInvoiceEmail} disabled={sending} style={{ padding: '7px 14px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                  {sending ? 'Sending...' : 'Send Invoice'}
                </button>
              )}
              <button onClick={deleteJob} style={{ padding: '7px 14px', background: 'white', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '7px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Delete</button>
            </div>
          </div>

          {/* Job Header */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>

              {/* Customer */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Customer</div>
                {editMode ? (
                  <div>
                    {customer ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{customer.name}</div>
                        {customer.company && <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.company}</div>}
                        {customer.email && <div style={{ fontSize: '12px', color: '#2563eb' }}>{customer.email}</div>}
                        <button onClick={() => setCustomer(null)} style={{ fontSize: '11px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}>Change</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button onClick={() => setShowCustomerSearch(true)} style={{ padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#2563eb', cursor: 'pointer', fontFamily: 'inherit' }}>Search Existing</button>
                        <button onClick={() => setShowCustomerModal(true)} style={{ padding: '6px 10px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit' }}>+ New Customer</button>
                      </div>
                    )}
                    {showCustomerSearch && (
                      <div style={{ position: 'relative', marginTop: '6px' }}>
                        <input autoFocus value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', padding: '6px 8px', border: '1px solid #2563eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', outline: 'none' }} />
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '180px', overflowY: 'auto' }}>
                          {allCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.company || '').toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                            <div key={c.id} onClick={() => assignCustomer(c)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <div style={{ fontWeight: 600 }}>{c.name}</div>
                              {c.company && <div style={{ fontSize: '11px', color: '#6b7280' }}>{c.company}</div>}
                            </div>
                          ))}
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
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No customer — click Edit to assign</div>
                )}
              </div>

              {/* Dates */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Dates</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { label: 'Payment Due', field: 'due_date' },
                    { label: 'Production Due', field: 'production_due_date' },
                    { label: 'Customer Due', field: 'customer_due_date' },
                  ].map(({ label, field }) => (
                    <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: '#6b7280' }}>{label}:</span>
                      {editMode ? (
                        <input type="date" value={job[field] || ''} onChange={e => updateJobField(field, e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '2px 4px', fontFamily: 'inherit' }} />
                      ) : <span style={{ fontWeight: 500 }}>{job[field] || '—'}</span>}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#6b7280' }}>Created:</span>
                    <span>{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Sales Rep + Financials */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Sales Rep</div>
                <select
                  value={job.sales_rep || ''}
                  onChange={e => updateJobField('sales_rep', e.target.value)}
                  disabled={!editMode}
                  style={{ padding: '5px 10px', border: '1px solid', borderColor: job.sales_rep ? '#bfdbfe' : '#e5e7eb', borderRadius: '100px', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', background: job.sales_rep ? '#eff6ff' : '#f3f4f6', color: job.sales_rep ? '#2563eb' : '#9ca3af', cursor: editMode ? 'pointer' : 'default', outline: 'none', marginBottom: '12px' }}
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>Financials</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Shipping:</span>
                    {editMode ? <input type="number" value={job.shipping_cost || 0} onChange={e => updateJobField('shipping_cost', parseFloat(e.target.value) || 0)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '1px 4px', width: '70px', textAlign: 'right', fontFamily: 'inherit' }} /> : <span>${(job.shipping_cost || 0).toFixed(2)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Discount:</span>
                    {editMode ? <input type="number" value={job.discount || 0} onChange={e => updateJobField('discount', parseFloat(e.target.value) || 0)} style={{ border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '11px', padding: '1px 4px', width: '70px', textAlign: 'right', fontFamily: 'inherit' }} /> : <span>-${(job.discount || 0).toFixed(2)}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: '4px', borderTop: '1px solid #f3f4f6' }}>
                    <span>Total:</span>
                    <span style={{ fontSize: '14px' }}>${total.toFixed(2)}</span>
                  </div>
                  {isInvoiceStage && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                        <span>Paid:</span>
                        <span>${(job.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: 600 }}>
                        <span>Balance Due:</span>
                        <span>${(job.amount_due || total).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '16px', background: 'white', borderRadius: '10px 10px 0 0', padding: '0 16px' }}>
            {['items', 'notes', 'activity'].map(tab => (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: activeTab === tab ? '#2563eb' : '#6b7280', borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent', textTransform: 'capitalize' }}>
                {tab}
              </div>
            ))}
          </div>

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0 0 10px 10px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Line Items</div>
                {editMode && (
                  <button onClick={() => setShowTypeModal(true)} style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Item</button>
                )}
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                  <div>No items yet — click Edit then Add Item</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8f9fb', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{ITEM_TYPES.find(t => t.id === item.item_type)?.icon || '📦'}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{ITEM_TYPES.find(t => t.id === item.item_type)?.label || 'Item'} {idx + 1}</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginLeft: '8px' }}>${(item.total || 0).toFixed(2)}</span>
                        </div>
                        {editMode && <span onClick={() => removeItem(idx)} style={{ cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '18px' }}>x</span>}
                      </div>

                      <div style={{ padding: '14px' }}>
                        {/* APPAREL */}
                        {item.item_type === 'apparel' && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                              {[
                                { label: 'DESCRIPTION', field: 'description', placeholder: 'Product name' },
                                { label: 'STYLE #', field: 'style_number', placeholder: 'e.g. 64000' },
                                { label: 'COLOR', field: 'color', placeholder: 'e.g. Navy' },
                                { label: 'UNIT PRICE', field: 'unit_price', type: 'number', placeholder: '0.00' },
                              ].map(({ label, field, type, placeholder }) => (
                                <div key={field}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                                  {editMode ? (
                                    <input type={type || 'text'} value={item[field]} onChange={e => updateItem(idx, field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                  ) : <div style={{ fontSize: '13px', fontWeight: field === 'unit_price' ? 600 : 400 }}>{field === 'unit_price' ? '$' + parseFloat(item[field] || 0).toFixed(2) : item[field] || '—'}</div>}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>SIZES</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
                                {['xs','s','m','l','xl','2xl','3xl','4xl'].map(size => (
                                  <div key={size} style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '3px', textTransform: 'uppercase' }}>{size}</div>
                                    {editMode ? (
                                      <input type="number" min="0" value={item['size_' + size] || 0} onChange={e => updateItem(idx, 'size_' + size, parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '5px 2px', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
                                    ) : (
                                      <div style={{ padding: '5px', background: item['size_' + size] > 0 ? '#eff6ff' : '#f9fafb', border: '1px solid', borderColor: item['size_' + size] > 0 ? '#bfdbfe' : '#e5e7eb', borderRadius: '5px', fontSize: '13px', fontWeight: item['size_' + size] > 0 ? 700 : 400, color: item['size_' + size] > 0 ? '#1d4ed8' : '#9ca3af' }}>
                                        {item['size_' + size] || 0}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
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
                                <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} />
                                <span style={{ fontSize: '12px' }}>Taxed</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* LARGE FORMAT */}
                        {item.item_type === 'large_format' && (
                          <div>
                            {/* Auto-price calculator */}
                            {editMode && (
                              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginBottom: '10px' }}>🖼 Auto-Price Calculator</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>WIDTH (ft)</div>
                                    <input type="number" step="0.1" value={item.width || ''} onChange={e => updateItem(idx, 'width', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>HEIGHT (ft)</div>
                                    <input type="number" step="0.1" value={item.height || ''} onChange={e => updateItem(idx, 'height', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>KIT/MATERIAL</div>
                                    <select value={selectedKits[idx] || ''} onChange={e => setSelectedKits({...selectedKits, [idx]: e.target.value})} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                      <option value="">Select kit...</option>
                                      {kits.filter(k => ['large_format', 'sign', 'banner', 'window'].includes(k.category)).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>QTY</div>
                                    <input type="number" value={item.quantity || 1} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                  </div>
                                  <button
                                    onClick={() => {
                                      const w = parseFloat(item.width) || 0;
                                      const h = parseFloat(item.height) || 0;
                                      const qty = parseInt(item.quantity) || 1;
                                      const sqft = w * h * qty;
                                      const kitId = selectedKits[idx];
                                      const kit = kits.find(k => k.id === kitId);
                                      if (!sqft) { alert('Enter width and height first'); return; }
                                      if (!kit) { alert('Select a kit first'); return; }
                                      applyLargeFormatKit(idx, kit, sqft, w, h, qty);
                                    }}
                                    disabled={!item.width || !item.height || !selectedKits[idx]}
                                    style={{ padding: '7px 14px', background: (!item.width || !item.height || !selectedKits[idx]) ? '#e5e7eb' : '#16a34a', color: (!item.width || !item.height || !selectedKits[idx]) ? '#9ca3af' : 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: (!item.width || !item.height || !selectedKits[idx]) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                  >
                                    ⚡ Calculate
                                  </button>
                                </div>
                                {item.width && item.height && (
                                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d' }}>
                                    📐 {item.width}ft × {item.height}ft = <strong>{(parseFloat(item.width) * parseFloat(item.height)).toFixed(2)} ft²</strong>
                                    {item.quantity > 1 && <span> × {item.quantity} = <strong>{(parseFloat(item.width) * parseFloat(item.height) * item.quantity).toFixed(2)} ft² total</strong></span>}
                                  </div>
                                )}
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                                {editMode ? <input value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="e.g. 4x8 Coroplast Sign" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>WIDTH (ft)</div>
                                {editMode ? <input type="number" step="0.1" value={item.width || ''} onChange={e => updateItem(idx, 'width', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px' }}>{item.width || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>HEIGHT (ft)</div>
                                {editMode ? <input type="number" step="0.1" value={item.height || ''} onChange={e => updateItem(idx, 'height', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px' }}>{item.height || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>QTY</div>
                                {editMode ? <input type="number" value={item.quantity || 1} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px' }}>{item.quantity}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>UNIT PRICE</div>
                                {editMode ? <input type="number" value={item.unit_price || 0} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '14px', fontWeight: 700 }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>MATERIAL/SUBSTRATE</div>
                                {editMode ? <input value={item.material || ''} onChange={e => updateItem(idx, 'material', e.target.value)} placeholder="e.g. 13oz Vinyl" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px' }}>{item.material || '—'}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px' }}>
                                <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} />
                                <span style={{ fontSize: '12px' }}>Taxed</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* VEHICLE WRAP */}
                        {item.item_type === 'vehicle_wrap' && (
                          <div>
                            {/* Auto-price calculator */}
                            {editMode && (
                              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', marginBottom: '10px' }}>🚗 Auto-Price Calculator</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>VEHICLE</div>
                                    <div style={{ position: 'relative' }}>
                                      <input
                                        value={showVehicleSearch === idx ? vehicleSearch : (item.vehicle_year && item.vehicle_make ? item.vehicle_year + ' ' + item.vehicle_make + ' ' + item.vehicle_model : '')}
                                        onChange={e => { setVehicleSearch(e.target.value); setShowVehicleSearch(idx); }}
                                        onFocus={() => setShowVehicleSearch(idx)}
                                        placeholder="Search vehicle..."
                                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                                      />
                                      {showVehicleSearch === idx && vehicleSearch && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                                          {vehicles.filter(v =>
                                            (v.make + ' ' + v.model + ' ' + v.year).toLowerCase().includes(vehicleSearch.toLowerCase())
                                          ).slice(0, 10).map(v => (
                                            <div key={v.id} onClick={() => { updateItem(idx, 'vehicle_year', String(v.year)); updateItem(idx, 'vehicle_make', v.make); updateItem(idx, 'vehicle_model', v.model); setVehicleSearch(v.year + ' ' + v.make + ' ' + v.model); setShowVehicleSearch(null); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                              <div style={{ fontWeight: 600 }}>{v.year} {v.make} {v.model}</div>
                                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Full: {v.full_wrap_sqft}ft² · Partial: {v.partial_wrap_sqft}ft²</div>
                                            </div>
                                          ))}
                                          {vehicles.filter(v => (v.make + ' ' + v.model + ' ' + v.year).toLowerCase().includes(vehicleSearch.toLowerCase())).length === 0 && (
                                            <div style={{ padding: '12px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>No vehicles found — add to vehicle database in Settings</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>WRAP TYPE</div>
                                    <select value={item.wrap_type || ''} onChange={e => updateItem(idx, 'wrap_type', e.target.value)} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                      <option value="">Select...</option>
                                      {WRAP_TYPES.map(w => <option key={w}>{w}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>KIT</div>
                                    <select value={selectedKits[idx] || ''} onChange={e => setSelectedKits({...selectedKits, [idx]: e.target.value})} style={{ width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                      <option value="">Select kit...</option>
                                      {kits.filter(k => k.category === 'vehicle_wrap').map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const vehicle = vehicles.find(v => v.year === parseInt(item.vehicle_year) && v.make === item.vehicle_make && v.model === item.vehicle_model);
                                      const kit = kits.find(k => k.id === selectedKits[idx]);
                                      applyVehicleKit(idx, vehicle, item.wrap_type, kit);
                                    }}
                                    disabled={!item.vehicle_make || !item.wrap_type || !selectedKits[idx]}
                                    style={{ padding: '7px 14px', background: (!item.vehicle_make || !item.wrap_type || !selectedKits[idx]) ? '#e5e7eb' : '#2563eb', color: (!item.vehicle_make || !item.wrap_type || !selectedKits[idx]) ? '#9ca3af' : 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: (!item.vehicle_make || !item.wrap_type || !selectedKits[idx]) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                                  >
                                    ⚡ Calculate
                                  </button>
                                </div>
                                {item.vehicle_make && item.wrap_type && (() => {
                                  const vehicle = vehicles.find(v => v.year === parseInt(item.vehicle_year) && v.make === item.vehicle_make && v.model === item.vehicle_model);
                                  const sqftMap = { 'Full Wrap': vehicle?.full_wrap_sqft, 'Partial Wrap': vehicle?.partial_wrap_sqft, 'Hood Wrap': vehicle?.hood_sqft, 'Roof Wrap': vehicle?.roof_sqft, 'Tailgate Wrap': vehicle?.tailgate_sqft, 'Door Wrap': vehicle?.doors_sqft };
                                  const sqft = sqftMap[item.wrap_type];
                                  if (!sqft) return null;
                                  return <div style={{ marginTop: '8px', fontSize: '12px', color: '#0369a1' }}>📐 {item.wrap_type}: <strong>{sqft} ft²</strong></div>;
                                })()}
                              </div>
                            )}

                            {/* Vehicle details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                              {[
                                { label: 'YEAR', field: 'vehicle_year', placeholder: '2024' },
                                { label: 'MAKE', field: 'vehicle_make', placeholder: 'Ford' },
                                { label: 'MODEL', field: 'vehicle_model', placeholder: 'F-150' },
                              ].map(({ label, field, placeholder }) => (
                                <div key={field}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                                  {editMode ? <input value={item[field] || ''} onChange={e => updateItem(idx, field, e.target.value)} placeholder={placeholder} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                  : <div style={{ fontSize: '13px' }}>{item[field] || '—'}</div>}
                                </div>
                              ))}
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>WRAP TYPE</div>
                                {editMode ? <select value={item.wrap_type || ''} onChange={e => updateItem(idx, 'wrap_type', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {WRAP_TYPES.map(w => <option key={w}>{w}</option>)}
                                </select> : <div style={{ fontSize: '13px' }}>{item.wrap_type || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>SQ FT</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>{item.width ? item.width + ' ft²' : '—'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                                {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Additional details..." style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px' }}>{item.description || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>PRICE</div>
                                {editMode ? <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>${parseFloat(item.unit_price || 0).toFixed(2)}</div>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PROMO + CUSTOM */}
                        {(item.item_type === 'promo' || item.item_type === 'custom') && (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: item.item_type === 'promo' ? '2fr 1fr 1fr 1fr 1fr' : '3fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>DESCRIPTION</div>
                                {editMode ? <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                                : <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.description || '—'}</div>}
                              </div>
                              {item.item_type === 'promo' && (
                                <>
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
                                </>
                              )}
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
                              <input type="checkbox" checked={item.taxed} onChange={e => updateItem(idx, 'taxed', e.target.checked)} disabled={!editMode} />
                              <span style={{ fontSize: '12px' }}>Taxed</span>
                            </div>
                          </div>
                        )}

                        {/* Imprint Details */}
                        {['apparel', 'promo', 'custom'].includes(item.item_type) && (
                          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>Imprint Details</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>METHOD</div>
                                {editMode ? <select value={item.imprint_method || ''} onChange={e => updateItem(idx, 'imprint_method', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {imprintMethods.map(m => <option key={m}>{m}</option>)}
                                </select> : <div style={{ fontSize: '13px' }}>{item.imprint_method || '—'}</div>}
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>LOCATION</div>
                                {editMode ? <select value={item.imprint_location || ''} onChange={e => updateItem(idx, 'imprint_location', e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit' }}>
                                  <option value="">Select...</option>
                                  {IMPRINT_LOCATIONS.map(l => <option key={l}>{l}</option>)}
                                </select> : <div style={{ fontSize: '13px' }}>{item.imprint_location || '—'}</div>}
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
                      ['Shipping', '$' + (parseFloat(job.shipping_cost) || 0).toFixed(2)],
                      ['Discount', '-$' + (parseFloat(job.discount) || 0).toFixed(2)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, padding: '10px 0 0' }}>
                      <span>Order Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    {isInvoiceStage && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', color: '#16a34a', fontWeight: 600 }}>
                          <span>Amount Paid</span>
                          <span>${(job.amount_paid || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, padding: '5px 0', color: '#dc2626' }}>
                          <span>Balance Due</span>
                          <span>${(job.amount_due || total).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Customer Notes', field: 'customer_notes', placeholder: 'Notes visible to customer...' },
                { label: 'Production Notes', field: 'production_notes', placeholder: 'Internal production notes...' },
              ].map(({ label, field, placeholder }) => (
                <div key={field} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>{label.toUpperCase()}</div>
                  <textarea
                    value={job[field] || ''}
                    onChange={e => updateJobField(field, e.target.value)}
                    rows={6}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Activity Log</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Job Created', date: job.created_at, color: '#2563eb' },
                  job.quote_sent_at && { label: 'Quote Sent to Customer', date: job.quote_sent_at, color: '#f59e0b' },
                  job.accepted_at && { label: 'Quote Accepted by Customer', date: job.accepted_at, color: '#16a34a' },
                  job.rejected_at && { label: 'Quote Rejected', date: job.rejected_at, color: '#dc2626' },
                ].filter(Boolean).map((event, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: event.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{event.label}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(event.date).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portal Link */}
          {customer?.portal_token && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 20px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Customer Portal Link</div>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/portal/' + customer.portal_token); alert('Portal link copied!'); }} style={{ padding: '6px 14px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Copy Link
              </button>
            </div>
          )}

        </main>
      </div>

      {/* ITEM TYPE MODAL */}
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>What type of item?</h2>
              <span onClick={() => setShowTypeModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ITEM_TYPES.map(type => (
                <button key={type.id} onClick={() => addItem(type.id)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#f8f9fb', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f8f9fb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
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
                  <input value={newCustomerForm.name} onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Company</label>
                  <input value={newCustomerForm.company} onChange={e => setNewCustomerForm({...newCustomerForm, company: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Email</label>
                  <input type="email" value={newCustomerForm.email} onChange={e => setNewCustomerForm({...newCustomerForm, email: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Phone</label>
                  <input value={newCustomerForm.phone} onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
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
    </div>
  );
}
