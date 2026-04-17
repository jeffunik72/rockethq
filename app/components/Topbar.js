'use client';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Topbar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ height: '52px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', flexShrink: 0 }}>
      <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '28px', height: '28px', background: '#111827', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🚀</div>
        RocketHQ
      </div>
      <div style={{ width: '1px', height: '22px', background: '#e5e7eb', margin: '0 4px' }} />
      <div style={{ fontSize: '13px', color: '#6b7280' }}>🏪 Blue Rocket</div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#2563eb', color: 'white', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JS</div>
        <div style={{ fontSize: '13px', lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600 }}>Jeff Savard</div>
          <div style={{ color: '#6b7280', fontSize: '11px' }}>Admin</div>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: '6px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
