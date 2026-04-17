'use client';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'products', label: 'Products' },
  { id: 'production', label: 'Production' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav style={{ width: '220px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0, padding: '8px 0', height: '100%' }}>
      {navItems.map(function(item) {
        return (
          <div
            key={item.id}
            onClick={function() { router.push('/' + item.id); }}
            style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', borderRadius: '6px', margin: '1px 6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: pathname === '/' + item.id ? '#2563eb' : '#374151', background: pathname === '/' + item.id ? '#eff6ff' : 'transparent' }}
          >
            {item.label}
          </div>
        );
      })}
    </nav>
  );
}
