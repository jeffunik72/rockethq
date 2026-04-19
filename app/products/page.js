'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const BRANDS = ['All Brands', '47 Brand', 'Adidas', 'Alternative', 'Augusta', 'Bayside', 'Bella+Canvas', 'Champion', 'Columbia', 'Comfort Colors', 'Fruit of the Loom', 'Gildan', 'Hanes', 'Independent Trading', 'Next Level', 'Nike', 'Port Authority', 'Port & Company', 'Richardson', 'Russell Athletic', 'Sport-Tek', 'Under Armour'];

const IMAGE_BASE = 'https://cdn.ssactivewear.com/';

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
      else setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!checking) fetchProducts();
  }, [checking, page, brand]);

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

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#6b7280' }}>Loading...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8f9fb' }}>

          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Products</h1>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>S&S Activewear Catalog — {products.length} styles shown</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by style name, title..."
                style={{ flex: 1, minWidth: '200px', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
              />
              <select
                value={brand}
                onChange={e => { setBrand(e.target.value); setPage(1); }}
                style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', minWidth: '160px' }}
              >
                {BRANDS.map(b => <option key={b} value={b === 'All Brands' ? '' : b}>{b}</option>)}
              </select>
              <button type="submit" style={{ padding: '9px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px', color: '#6b7280' }}>
              <div style={{ fontSize: '32px' }}>⏳</div>
              <div>Loading products from S&S Activewear...</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {products.map((product) => (
                  <div
                    key={product.styleID}
                    onClick={() => setSelectedProduct(product)}
                    style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ height: '160px', background: '#f8f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {product.styleImage ? (
                        <img
                          src={IMAGE_BASE + product.styleImage}
                          alt={product.title}
                          style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ fontSize: '40px', color: '#d1d5db' }}>👕</div>
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', marginBottom: '2px', textTransform: 'uppercase' }}>{product.brandName}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px', lineHeight: 1.3 }}>{product.title}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{product.styleName} · {product.baseCategory}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingBottom: '24px' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#9ca3af' : '#374151', fontFamily: 'inherit' }}>
                  Previous
                </button>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={products.length < 24} style={{ padding: '8px 16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '7px', fontSize: '13px', cursor: products.length < 24 ? 'not-allowed' : 'pointer', color: products.length < 24 ? '#9ca3af' : '#374151', fontFamily: 'inherit' }}>
                  Next
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', marginBottom: '2px' }}>{selectedProduct.brandName}</div>
                <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedProduct.title}</h2>
              </div>
              <span onClick={() => setSelectedProduct(null)} style={{ cursor: 'pointer', fontSize: '24px', color: '#6b7280', lineHeight: 1 }}>x</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                  {selectedProduct.styleImage ? (
                    <img src={IMAGE_BASE + selectedProduct.styleImage} alt={selectedProduct.title} style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ fontSize: '48px' }}>👕</div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {[
                      ['Style #', selectedProduct.styleName],
                      ['Part #', selectedProduct.partNumber],
                      ['Category', selectedProduct.baseCategory],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280' }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {selectedProduct.sustainableStyle && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                      🌱 Sustainable Style
                    </div>
                  )}
                </div>
              </div>

              {selectedProduct.description && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>DESCRIPTION</div>
                  <div
                    style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}
                    dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                  />
                </div>
              )}

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 600, marginBottom: '4px' }}>View pricing & inventory</div>
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>Search this style in your S&S dealer portal for full pricing by color and size</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
