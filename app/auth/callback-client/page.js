'use client';
import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Let Supabase handle session from URL automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard');
      } else {
        // Try exchanging code if present
        const code = searchParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (!error) router.push('/dashboard');
            else router.push('/login');
          });
        } else {
          router.push('/dashboard');
        }
      }
    });
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚀</div>
        <div style={{ color: '#6b7280' }}>Signing you in...</div>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
