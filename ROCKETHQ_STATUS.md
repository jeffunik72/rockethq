# RocketHQ Build Status

## Live URL: portal.rockethq.io
## GitHub: github.com/jeffunik72/rockethq
## Local: ~/Desktop/rockethq

## Stack
- Next.js 16.2.4, Tailwind, Recharts
- Supabase (PostgreSQL)
- Vercel hosting
- Resend (email)
- Stripe (payments)
- NextAuth + Supabase OAuth (Google login)

## Login
- Google OAuth via Supabase (primary)
- NextAuth for Gmail/Calendar scopes
- Callback: /auth/callback-client

## What's Built
- Dashboard with charts
- Pipeline (Kanban + activity log)
- Jobs (unified model, auto-pricing)
- Customers (contacts, tasks, billing, shipping, tax)
- Gmail inbox (HTML rendering)
- Google Calendar (drag & drop, 3 views)
- Tasks (global + per customer)
- Production board (per-method stages)
- Pricing engine (materials, kits, vehicle DB)
- Customer portal (Stripe payments)
- Settings (everything configurable)
- Printavo import (223 customers, 70 jobs)

## Remaining
- Imprint Files (Google Drive per job)
- Accounting page
- Staff/multi-user logins
