'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MATERIAL_CATEGORIES = ['vinyl', 'laminate', 'substrate', 'ink', 'other'];
const KIT_CATEGORIES = ['vehicle_wrap', 'large_format', 'sign', 'banner', 'window', 'other'];
const UNITS = ['sqft', 'linear_ft', 'sheet', 'roll', 'each'];

export default function PricingPage() {
  const [tab, setTab] = useState('materials');
  const [materials, setMaterials] = useState([]);
  const [kits, setKits] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showKitModal, setShowKitModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState(null);
  const [editKit, setEditKit] = useState(null);
  const [editVehicle, setEditVehicle] = useState(null);
  const [materialForm, setMaterialForm] = useState({ name: '', category: 'vinyl', brand: '', sku: '', cost_per_sqft: 0, unit: 'sqft', width_inches: '', notes: '' });
  const [kitForm, setKitForm] = useState({ name: '', description: '', category: 'vehicle_wrap', target_margin: 45, waste_factor: 15, install_cost_sqft: 0 });
  const [kitMaterials, setKitMaterials] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({ year: new Date().getFullYear(), make: '', model: '', trim: '', body_style: 'van', full_wrap_sqft: '', partial_wrap_sqft: '', hood_sqft: '', roof_sqft: '', tailgate_sqft: '', doors_sqft: '', notes: '' });
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // NHTSA API state
  const [nhtsa, setNhtsa] = useState({ makes: [], models: [], loading: false });

  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchAll(); }
    });
  }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: mats }, { data: kitsData }, { data: vehs }] = await Promise.all([
      supabase.from('materials').select('*').eq('active', true).order('category').order('name'),
      supabase.from('material_kits').select('*, kit_materials(*, materials(*))').eq('active', true).order('name'),
      supabase.from('vehicles').select('*').order('make').order('model').order('year', { ascending: false }),
    ]);
    setMaterials(mats || []);
    setKits(kitsData || []);
    setVehicles(vehs || []);
    setLoading(false);
  }

  async function fetchNHTSAMakes(year) {
    setNhtsa(prev => ({ ...prev, loading: true, models: [] }));
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json`);
      const data = await res.json();
      const makes = (data.Results || []).map(m => m.MakeName).sort();
      setNhtsa(prev => ({ ...prev, makes, loading: false }));
    } catch {
      setNhtsa(prev => ({ ...prev, loading: false }));
    }
  }

  async function fetchNHTSAModels(year, make) {
    setNhtsa(prev => ({ ...prev, loading: true, models: [] }));
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`);
      const data = await res.json();
      const models = (data.Results || []).map(m => m.Model_Name).sort();
      setNhtsa(prev => ({ ...prev, models, loading: false }));
    } catch {
      setNhtsa(prev => ({ ...prev, loading: false }));
    }
  }

  async function saveMaterial() {
    setSaving(true);
    if (editMaterial) {
      await supabase.from('materials').update(materialForm).eq('id', editMaterial.id);
    } else {
      await supabase.from('materials').insert([materialForm]);
    }
    await fetchAll();
    setShowMaterialModal(false);
    setEditMaterial(null);
    setMaterialForm({ name: '', category: 'vinyl', brand: '', sku: '', cost_per_sqft: 0, unit: 'sqft', width_inches: '', notes: '' });
    setSaving(false);
  }

  async function deleteMaterial(id) {
    if (!confirm('Delete this material?')) return;
    await supabase.from('materials').update({ active: false }).eq('id', id);
    await fetchAll();
  }

  async function saveKit() {
    setSaving(true);
    let kitId;
    if (editKit) {
      await supabase.from('material_kits').update(kitForm).eq('id', editKit.id);
      kitId = editKit.id;
      await supabase.from('kit_materials').delete().eq('kit_id', kitId);
    } else {
      const { data } = await supabase.from('material_kits').insert([kitForm]).select().single();
      kitId = data.id;
    }
    if (kitMaterials.length > 0) {
      await supabase.from('kit_materials').insert(kitMaterials.map(km => ({ kit_id: kitId, material_id: km.material_id, quantity_per_sqft: km.quantity_per_sqft })));
    }
    await fetchAll();
    setShowKitModal(false);
    setEditKit(null);
    setKitForm({ name: '', description: '', category: 'vehicle_wrap', target_margin: 45, waste_factor: 15, install_cost_sqft: 0 });
    setKitMaterials([]);
    setSaving(false);
  }

  async function deleteKit(id) {
    if (!confirm('Delete this kit?')) return;
    await supabase.from('material_kits').update({ active: false }).eq('id', id);
    await fetchAll();
  }

  async function saveVehicle() {
    setSaving(true);
    if (editVehicle) {
      await supabase.from('vehicles').update(vehicleForm).eq('id', editVehicle.id);
    } else {
      await supabase.from('vehicles').insert([vehicleForm]);
    }
    await fetchAll();
    setShowVehicleModal(false);
    setEditVehicle(null);
    setVehicleForm({ year: new Date().getFullYear(), make: '', model: '', trim: '', body_style: 'van', full_wrap_sqft: '', partial_wrap_sqft: '', hood_sqft: '', roof_sqft: '', tailgate_sqft: '', doors_sqft: '', notes: '' });
    setSaving(false);
  }

  async function deleteVehicle(id) {
    if (!confirm('Delete this vehicle?')) return;
    await supabase.from('vehicles').delete().eq('id', id);
    await fetchAll();
  }

  function openEditMaterial(mat) {
    setEditMaterial(mat);
    setMaterialForm({ name: mat.name, category: mat.category, brand: mat.brand || '', sku: mat.sku || '', cost_per_sqft: mat.cost_per_sqft || 0, unit: mat.unit || 'sqft', width_inches: mat.width_inches || '', notes: mat.notes || '' });
    setShowMaterialModal(true);
  }

  function openEditKit(kit) {
    setEditKit(kit);
    setKitForm({ name: kit.name, description: kit.description || '', category: kit.category, target_margin: kit.target_margin, waste_factor: kit.waste_factor, install_cost_sqft: kit.install_cost_sqft || 0 });
    setKitMaterials((kit.kit_materials || []).map(km => ({ material_id: km.material_id, material_name: km.materials?.name, quantity_per_sqft: km.quantity_per_sqft })));
    setShowKitModal(true);
  }

  function openEditVehicle(veh) {
    setEditVehicle(veh);
    setVehicleForm({ year: veh.year, make: veh.make, model: veh.model, trim: veh.trim || '', body_style: veh.body_style || 'van', full_wrap_sqft: veh.full_wrap_sqft || '', partial_wrap_sqft: veh.partial_wrap_sqft || '', hood_sqft: veh.hood_sqft || '', roof_sqft: veh.roof_sqft || '', tailgate_sqft: veh.tailgate_sqft || '', doors_sqft: veh.doors_sqft || '', notes: veh.notes || '' });
    setShowVehicleModal(true);
  }

  function getKitCostPerSqft(kit) {
    const matCost = (kit.kit_materials || []).reduce((s, km) => s + ((km.materials?.cost_per_sqft || 0) * (km.quantity_per_sqft || 1)), 0);
    const withWaste = matCost * (1 + (kit.waste_factor || 0) / 100);
    return withWaste + (kit.install_cost_sqft || 0);
  }

  function getKitSellPrice(kit) {
    const cost = getKitCostPerSqft(kit);
    return cost / (1 - (kit.target_margin || 40) / 100);
  }

  const filteredVehicles = vehicles.filter(v =>
    !vehicleSearch ||
    v.make.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    String(v.year).includes(vehicleSearch)
  );

  const filteredMaterials = materials.filter(m =>
    !materialSearch ||
    m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
    (m.brand || '').toLowerCase().includes(materialSearch.toLowerCase())
  );

  const groupedMaterials = MATERIAL_CATEGORIES.reduce((acc, cat) => {
    const mats = filteredMaterials.filter(m => m.category === cat);
    if (mats.length > 0) acc[cat] = mats;
    return acc;
  }, {});

  if (checking || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>💲</div>
        <div>Loading pricing engine...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8f9fb' }}>

          {/* Header */}
          <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pricing Engine</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Manage materials, kits, and vehicle database for auto-pricing</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tab === 'materials' && <button onClick={() => { setEditMaterial(null); setShowMaterialModal(true); }} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Material</button>}
              {tab === 'kits' && <button onClick={() => { setEditKit(null); setKitMaterials([]); setShowKitModal(true); }} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Kit</button>}
              {tab === 'vehicles' && <button onClick={() => { setEditVehicle(null); setShowVehicleModal(true); fetchNHTSAMakes(vehicleForm.year); }} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Vehicle</button>}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex' }}>
            {[
              { id: 'materials', label: '🎨 Materials', count: materials.length },
              { id: 'kits', label: '📦 Kits', count: kits.length },
              { id: 'vehicles', label: '🚗 Vehicle Database', count: vehicles.length },
            ].map(t => (
              <div key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: tab === t.id ? '#2563eb' : '#6b7280', borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {t.label}
                <span style={{ background: tab === t.id ? '#dbeafe' : '#f3f4f6', color: tab === t.id ? '#2563eb' : '#6b7280', padding: '1px 7px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>{t.count}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '24px' }}>

            {/* MATERIALS TAB */}
            {tab === 'materials' && (
              <div>
                <input value={materialSearch} onChange={e => setMaterialSearch(e.target.value)} placeholder="Search materials..." style={{ width: '300px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', marginBottom: '16px', display: 'block' }} />
                {Object.entries(groupedMaterials).map(([cat, mats]) => (
                  <div key={cat} style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {cat} <span style={{ background: '#f3f4f6', padding: '1px 7px', borderRadius: '100px', fontSize: '11px' }}>{mats.length}</span>
                    </div>
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                            {['Name', 'Brand', 'SKU', 'Cost/sqft', 'Unit', 'Width', ''].map(h => (
                              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mats.map(mat => (
                            <tr key={mat.id} style={{ borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                              <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{mat.name}</td>
                              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280' }}>{mat.brand || '—'}</td>
                              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#9ca3af' }}>{mat.sku || '—'}</td>
                              <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#111827' }}>${parseFloat(mat.cost_per_sqft || 0).toFixed(3)}</td>
                              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6b7280' }}>{mat.unit}</td>
                              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6b7280' }}>{mat.width_inches ? mat.width_inches + '"' : '—'}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button onClick={() => openEditMaterial(mat)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                                  <button onClick={() => deleteMaterial(mat.id)} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* KITS TAB */}
            {tab === 'kits' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {kits.map(kit => {
                  const costPerSqft = getKitCostPerSqft(kit);
                  const sellPerSqft = getKitSellPrice(kit);
                  return (
                    <div key={kit.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{kit.name}</div>
                          <span style={{ fontSize: '11px', background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, textTransform: 'capitalize' }}>{kit.category.replace('_', ' ')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEditKit(kit)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                          <button onClick={() => deleteKit(kit.id)} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                        </div>
                      </div>

                      {kit.description && <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>{kit.description}</div>}

                      {/* Materials in kit */}
                      {(kit.kit_materials || []).length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '6px', textTransform: 'uppercase' }}>Materials</div>
                          {kit.kit_materials.map(km => (
                            <div key={km.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #f9fafb' }}>
                              <span style={{ color: '#374151' }}>{km.materials?.name}</span>
                              <span style={{ color: '#6b7280' }}>${((km.materials?.cost_per_sqft || 0) * km.quantity_per_sqft).toFixed(3)}/sqft</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pricing breakdown */}
                      <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>COST/SQFT</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>${costPerSqft.toFixed(3)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>MARGIN</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f97316' }}>{kit.target_margin}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>SELL/SQFT</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>${sellPerSqft.toFixed(2)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
                        <span>Waste: {kit.waste_factor}%</span>
                        {kit.install_cost_sqft > 0 && <span>Install: ${kit.install_cost_sqft}/sqft</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VEHICLES TAB */}
            {tab === 'vehicles' && (
              <div>
                <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} placeholder="Search by make, model or year..." style={{ width: '300px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', marginBottom: '16px', display: 'block' }} />
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Year', 'Make', 'Model', 'Style', 'Full Wrap', 'Partial', 'Hood', 'Roof', 'Tailgate', 'Doors', ''].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map(veh => (
                        <tr key={veh.id} style={{ borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f8f9fb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: 600 }}>{veh.year}</td>
                          <td style={{ padding: '9px 12px', fontSize: '13px' }}>{veh.make}</td>
                          <td style={{ padding: '9px 12px', fontSize: '13px' }}>{veh.model}{veh.trim ? ' ' + veh.trim : ''}</td>
                          <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{veh.body_style}</td>
                          <td style={{ padding: '9px 12px', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>{veh.full_wrap_sqft ? veh.full_wrap_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: '13px' }}>{veh.partial_wrap_sqft ? veh.partial_wrap_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>{veh.hood_sqft ? veh.hood_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>{veh.roof_sqft ? veh.roof_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>{veh.tailgate_sqft ? veh.tailgate_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px', fontSize: '12px', color: '#6b7280' }}>{veh.doors_sqft ? veh.doors_sqft + ' ft²' : '—'}</td>
                          <td style={{ padding: '9px 12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => openEditVehicle(veh)} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                              <button onClick={() => deleteVehicle(veh.id)} style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MATERIAL MODAL */}
      {showMaterialModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editMaterial ? 'Edit Material' : 'Add Material'}</h2>
              <span onClick={() => setShowMaterialModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Material Name *</label>
                <input value={materialForm.name} onChange={e => setMaterialForm({...materialForm, name: e.target.value})} placeholder="e.g. Avery MPI 1105 Easy Apply RS" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Category</label>
                  <select value={materialForm.category} onChange={e => setMaterialForm({...materialForm, category: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Brand</label>
                  <input value={materialForm.brand} onChange={e => setMaterialForm({...materialForm, brand: e.target.value})} placeholder="Avery, 3M, Oracal..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Cost per sqft ($)</label>
                  <input type="number" step="0.001" value={materialForm.cost_per_sqft} onChange={e => setMaterialForm({...materialForm, cost_per_sqft: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Unit</label>
                  <select value={materialForm.unit} onChange={e => setMaterialForm({...materialForm, unit: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Width (inches)</label>
                  <input type="number" value={materialForm.width_inches} onChange={e => setMaterialForm({...materialForm, width_inches: e.target.value})} placeholder="54" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>SKU / Part Number</label>
                <input value={materialForm.sku} onChange={e => setMaterialForm({...materialForm, sku: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={materialForm.notes} onChange={e => setMaterialForm({...materialForm, notes: e.target.value})} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowMaterialModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveMaterial} disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>{saving ? 'Saving...' : editMaterial ? 'Save Changes' : 'Add Material'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KIT MODAL */}
      {showKitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editKit ? 'Edit Kit' : 'Add Kit'}</h2>
              <span onClick={() => setShowKitModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Kit Name *</label>
                  <input value={kitForm.name} onChange={e => setKitForm({...kitForm, name: e.target.value})} placeholder="e.g. Commercial Vehicle Wrap" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Category</label>
                  <select value={kitForm.category} onChange={e => setKitForm({...kitForm, category: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {KIT_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Description</label>
                <input value={kitForm.description} onChange={e => setKitForm({...kitForm, description: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Target Margin (%)</label>
                  <input type="number" value={kitForm.target_margin} onChange={e => setKitForm({...kitForm, target_margin: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Waste Factor (%)</label>
                  <input type="number" value={kitForm.waste_factor} onChange={e => setKitForm({...kitForm, waste_factor: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Install Cost/sqft ($)</label>
                  <input type="number" step="0.01" value={kitForm.install_cost_sqft} onChange={e => setKitForm({...kitForm, install_cost_sqft: parseFloat(e.target.value) || 0})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>

              {/* Kit Materials */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>MATERIALS IN KIT</div>
                {kitMaterials.map((km, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <select value={km.material_id} onChange={e => {
                      const mat = materials.find(m => m.id === e.target.value);
                      const updated = [...kitMaterials];
                      updated[idx] = { ...updated[idx], material_id: e.target.value, material_name: mat?.name };
                      setKitMaterials(updated);
                    }} style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                      <option value="">Select material...</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.01" value={km.quantity_per_sqft} onChange={e => {
                        const updated = [...kitMaterials];
                        updated[idx] = { ...updated[idx], quantity_per_sqft: parseFloat(e.target.value) || 1 };
                        setKitMaterials(updated);
                      }} style={{ width: '70px', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>qty/sqft</span>
                    </div>
                    <button onClick={() => setKitMaterials(kitMaterials.filter((_, i) => i !== idx))} style={{ fontSize: '18px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                <button onClick={() => setKitMaterials([...kitMaterials, { material_id: '', material_name: '', quantity_per_sqft: 1 }])} style={{ padding: '7px 14px', background: '#f8f9fb', border: '1px dashed #d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', color: '#374151', marginTop: '4px' }}>
                  + Add Material
                </button>
              </div>

              {/* Live cost preview */}
              {kitMaterials.length > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', marginBottom: '8px' }}>PRICING PREVIEW</div>
                  {(() => {
                    const matCost = kitMaterials.reduce((s, km) => {
                      const mat = materials.find(m => m.id === km.material_id);
                      return s + ((mat?.cost_per_sqft || 0) * (km.quantity_per_sqft || 1));
                    }, 0);
                    const withWaste = matCost * (1 + kitForm.waste_factor / 100);
                    const totalCost = withWaste + kitForm.install_cost_sqft;
                    const sellPrice = totalCost / (1 - kitForm.target_margin / 100);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                        {[
                          { label: 'Mat Cost', value: '$' + matCost.toFixed(3) },
                          { label: 'w/ Waste', value: '$' + withWaste.toFixed(3) },
                          { label: 'Total Cost', value: '$' + totalCost.toFixed(3) },
                          { label: 'Sell Price', value: '$' + sellPrice.toFixed(2), highlight: true },
                        ].map(item => (
                          <div key={item.label}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>{item.label}/sqft</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: item.highlight ? '#16a34a' : '#111827' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowKitModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveKit} disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>{saving ? 'Saving...' : editKit ? 'Save Changes' : 'Create Kit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {showVehicleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <span onClick={() => setShowVehicleModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Year *</label>
                  <input type="number" value={vehicleForm.year} onChange={e => { setVehicleForm({...vehicleForm, year: parseInt(e.target.value) || new Date().getFullYear(), make: '', model: ''}); fetchNHTSAMakes(e.target.value); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Make * {nhtsa.loading && <span style={{ color: '#9ca3af' }}>loading...</span>}</label>
                  <select value={vehicleForm.make} onChange={e => { setVehicleForm({...vehicleForm, make: e.target.value, model: ''}); if (e.target.value) fetchNHTSAModels(vehicleForm.year, e.target.value); }} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select make...</option>
                    {nhtsa.makes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Model *</label>
                  <select value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    <option value="">Select model...</option>
                    {nhtsa.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Trim</label>
                  <input value={vehicleForm.trim} onChange={e => setVehicleForm({...vehicleForm, trim: e.target.value})} placeholder="e.g. XLT, Limited..." style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Body Style</label>
                  <select value={vehicleForm.body_style} onChange={e => setVehicleForm({...vehicleForm, body_style: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit' }}>
                    {['sedan', 'suv', 'truck', 'van', 'box truck', 'trailer', 'other'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>SQUARE FOOTAGE DATA</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Full Wrap (ft²)', field: 'full_wrap_sqft' },
                  { label: 'Partial Wrap (ft²)', field: 'partial_wrap_sqft' },
                  { label: 'Hood (ft²)', field: 'hood_sqft' },
                  { label: 'Roof (ft²)', field: 'roof_sqft' },
                  { label: 'Tailgate (ft²)', field: 'tailgate_sqft' },
                  { label: 'Doors (ft²)', field: 'doors_sqft' },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{label}</label>
                    <input type="number" value={vehicleForm[field]} onChange={e => setVehicleForm({...vehicleForm, [field]: e.target.value})} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Notes</label>
                <textarea value={vehicleForm.notes} onChange={e => setVehicleForm({...vehicleForm, notes: e.target.value})} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowVehicleModal(false)} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveVehicle} disabled={saving} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>{saving ? 'Saving...' : editVehicle ? 'Save Changes' : 'Add Vehicle'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
