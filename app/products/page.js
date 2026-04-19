'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const BRANDS = ['All Brands', '47 Brand', 'Adidas', 'Alternative', 'Anvil', 'Augusta', 'Bayside', 'Bella+Canvas', 'Champion', 'Columbia', 'Comfort Colors', 'Fruit of the Loom', 'Gildan', 'Hanes', 'Independent Trading', 'Next Level', 'Nike', 'Port Authority', 'Port & Company', 'Richardson', 'Russell Athletic', 'Sport-Tek', 'Under Armour'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else { setChecking(false); fetchProducts(); }
    });
  }, []);

  useEffect(() => {
    if (!checking) fetchProducts();
  }, [page, brand, checking]);

  async function fetchProducts() {
    setLoading(true);
    let url = '/api/ss-products?page=' + page;
    if (search) url += '&search=' + encodeURIComponent(search);
    if (brand && brand !== 'All Brands') url += '&brand=' + encodeURIComponent(brand);
    const res = await fetch(url);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  }

  const imageBase = 'https://cdn.ssactivewear.com/';

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Products</h1>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>S&S Activewear Catalog</div>
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by style, brand, description..."
                style={{ flex: 1, minWidth: '200px', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
              />
              <select
                value={brand}
                onChange={e => { setBrand(e.target.value); setPage(1); }}
                style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', minWidth: '160px' }}
              >
                {BRANDS.map(b => <option key={b} value={b === 'All Brands' ? '' : b}>{b}</option>)}
              </select>
              <button type="submit" style={{ padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#6b7280' }}>
              Loading products...
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {products.map((product, i) => (
                  <div
                    key={product.sku + i}
                    onClick={() => setSelectedProduct(product)}
                    style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                  >
                    <div style={{ height: '180px', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {product.colorFrontImage ? (
                        <img src={imageBase + product.colorFrontImage} alt={product.styleName} style={{ maxHeight: '170px', maxWidth: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ fontSize: '32px', color: '#d1d5db' }}>👕</div>
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '2px' }}>{product.brandName}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>{product.styleName}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{product.colorName} · {product.sizeName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>${product.customerPrice?.toFixed(2)}</span>
                        <span style={{ fontSize: '11px', color: product.qty > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {product.qty > 0 ? product.qty + ' in stock' : 'Out of stock'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>SKU: {product.sku}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9ca3af' : '#374151', fontFamily: 'inherit' }}>Previous</button>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={products.length < 24} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', cursor: products.length < 24 ? 'not-allowed' : 'pointer', color: products.length < 24 ? '#9ca3af' : '#374151', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}
        </main>
      </div>

      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedProduct.brandName} - {selectedProduct.styleName}</h2>
              <span onClick={() => setSelectedProduct(null)} style={{ cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  {selectedProduct.colorFrontImage ? (
                    <img src={'https://cdn.ssactivewear.com/' + selectedProduct.colorFrontImage} alt={selectedProduct.styleName} style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ fontSize: '48px' }}>👕</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>{selectedProduct.brandName}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{selectedProduct.styleName}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>{selectedProduct.colorName}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {[
                      ['SKU', selectedProduct.sku],
                      ['Size', selectedProduct.sizeName],
                      ['In Stock', (selectedProduct.qty || 0).toLocaleString() + ' units'],
                      ['Case Qty', selectedProduct.caseQty],
                      ['Weight', selectedProduct.unitWeight + ' lbs'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280' }}>{k}</span>
                        <span style={{ fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Your Price</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d' }}>${selectedProduct.customerPrice?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Retail: ${selectedProduct.retailPrice?.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>PRICING TIERS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {[['Piece', selectedProduct.piecePrice], ['Dozen', selectedProduct.dozenPrice], ['Case', selectedProduct.casePrice]].map(([label, price]) => (
                    <div key={label} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>${price?.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedProduct.warehouses && selectedProduct.warehouses.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>WAREHOUSE INVENTORY</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedProduct.warehouses.map(wh => (
                      <div key={wh.warehouseAbbr} style={{ background: wh.qty > 0 ? '#f0fdf4' : '#f9fafb', border: '1px solid', borderColor: wh.qty > 0 ? '#86efac' : '#e5e7eb', borderRadius: '6px', padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{wh.warehouseAbbr}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: wh.qty > 0 ? '#16a34a' : '#9ca3af' }}>{wh.qty}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
