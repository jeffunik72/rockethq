'use client';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'pipeline', label: 'Pipeline', icon: '⇅' },
  { id: 'quotes', label: 'Quotes', icon: '📄' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'customers', label: 'Customers', icon: '👤' },
  { id: 'emails', label: 'Emails', icon: '📧' },
  { id: 'production', label: 'Production', icon: '⏱' },
  { id: 'expenses', label: 'Expenses', icon: '💲' },
  { id: 'products', label: 'Products', icon: '📦' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{ width: '220px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, padding: '8px 0', height: '100%' }}>
      {navItems.map(item => (
        <div
          key={item.id}
          onClick={() => router.push('/' + item.id)}
          style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 14px', borderRadius: '6px', margin: '1px 6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: pathname === '/' + item.id ? '#2563eb' : '#374151', background: pathname === '/' + item.id ? '#eff6ff' : 'transparent' }}
        >
          <span style={{ fontSize: '14px' }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f0f1f3' }}>
        <div onClick={() => router.push('/settings')} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 14px', borderRadius: '6px', margin: '1px 6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: pathname === '/settings' ? '#2563eb' : '#374151', background: pathname === '/settings' ? '#eff6ff' : 'transparent' }}>
          ⚙ Settings
        </div>
        <div onClick={async () => { const { createClient } = await import('@supabase/supabase-js'); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); await s.auth.signOut(); window.location.href = '/login'; }} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 14px', borderRadius: '6px', margin: '1px 6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
          → Logout
        </div>
      </div>
    </nav>
  );
}
