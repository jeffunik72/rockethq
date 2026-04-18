import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const { invoice, customer, order } = await request.json();

    const [{ data: customerData }, { data: settings }] = await Promise.all([
      supabase.from('customers').select('portal_token').eq('id', customer.id).single(),
      supabase.from('settings').select('*').single(),
    ]);

    const shopName = settings?.shop_name || 'Blue Rocket';
    const shopEmail = settings?.shop_email || 'hello@rockethq.io';
    const shopPhone = settings?.shop_phone || '';
    const depositPct = settings?.deposit_percentage || 50;
    const invoiceTerms = settings?.invoice_terms || 'Net 30';
    const portalUrl = 'https://portal.rockethq.io/portal/' + (customerData?.portal_token || '');
    const phoneSection = shopPhone ? ' | ' + shopPhone : '';
    const depositAmount = (invoice.amount_due * depositPct / 100).toFixed(2);

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/></head>' +
      '<body style="font-family:system-ui,sans-serif;background:#f8f9fb;margin:0;padding:40px 20px">' +
      '<div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">' +
      '<div style="background:#111827;padding:28px 32px">' +
      '<table width="100%"><tr>' +
      '<td><span style="color:white;font-size:20px;font-weight:700">' + shopName + '</span></td>' +
      '<td align="right"><span style="color:#9ca3af;font-size:12px">Invoice</span><br>' +
      '<span style="color:white;font-size:16px;font-weight:700">INV-' + invoice.id.slice(0,8).toUpperCase() + '</span></td>' +
      '</tr></table></div>' +
      '<div style="padding:32px">' +
      '<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#111827">Hi ' + customer.name.split(' ')[0] + ',</h1>' +
      '<p style="font-size:15px;color:#6b7280;margin:0 0 28px;line-height:1.6">Your invoice is ready. Please choose a payment option below.</p>' +
      '<div style="background:#111827;color:white;border-radius:8px;padding:20px 24px;margin-bottom:28px;text-align:center">' +
      '<div style="font-size:12px;color:#9ca3af;margin-bottom:4px">Total Amount Due</div>' +
      '<div style="font-size:40px;font-weight:700">$' + parseFloat(invoice.amount_due).toFixed(2) + '</div>' +
      (invoice.amount_paid > 0 ? '<div style="font-size:13px;color:#86efac;margin-top:8px">$' + parseFloat(invoice.amount_paid).toFixed(2) + ' already paid</div>' : '') +
      '</div>' +
      '<div style="background:#f8f9fb;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">' +
      '<p style="font-size:14px;color:#374151;font-weight:600;margin:0 0 16px">Choose how you would like to pay:</p>' +
      '<table align="center" style="margin-bottom:16px"><tr>' +
      '<td style="padding:0 6px"><a href="' + portalUrl + '" style="display:inline-block;background:#2563eb;color:white;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Pay in Full - $' + parseFloat(invoice.amount_due).toFixed(2) + '</a></td>' +
      '<td style="padding:0 6px"><a href="' + portalUrl + '" style="display:inline-block;background:white;color:#2563eb;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;border:2px solid #2563eb">' + depositPct + '% Deposit - $' + depositAmount + '</a></td>' +
      '</tr></table>' +
      '<a href="' + portalUrl + '" style="display:inline-block;background:white;color:#6b7280;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #e5e7eb">Custom Amount</a>' +
      '<p style="font-size:12px;color:#9ca3af;margin:16px 0 0">All payment options available in your secure customer portal.</p>' +
      '</div>' +
      '</div>' +
      '<div style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">' +
      '<p style="font-size:13px;color:#6b7280;margin:0 0 4px">Questions? <a href="mailto:' + shopEmail + '" style="color:#2563eb">' + shopEmail + '</a>' + phoneSection + '</p>' +
      '<p style="font-size:12px;color:#9ca3af;margin:0">' + shopName + ' | Powered by RocketHQ</p>' +
      '</div></div></body></html>';

    const { data, error } = await resend.emails.send({
      from: shopName + ' <quotes@rockethq.io>',
      to: customer.email,
      subject: 'Invoice from ' + shopName + ' - $' + parseFloat(invoice.amount_due).toFixed(2) + ' due',
      html,
    });

    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ success: true, data });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
