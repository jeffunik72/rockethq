import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const { quote, customer, items } = await request.json();

    const [{ data: customerData }, { data: settings }] = await Promise.all([
      supabase.from('customers').select('portal_token').eq('id', customer.id).single(),
      supabase.from('settings').select('*').single(),
    ]);

    const shopName = settings?.shop_name || 'Blue Rocket';
    const shopEmail = settings?.shop_email || 'hello@rockethq.io';
    const shopPhone = settings?.shop_phone || '';
    const shopWebsite = settings?.shop_website || 'portal.rockethq.io';
    const quoteTerms = settings?.quote_terms || '';
    const emailSignature = settings?.email_signature || '';
    const portalUrl = 'https://portal.rockethq.io/portal/' + (customerData?.portal_token || '');

    const itemsHTML = items.map(function(item) {
      return '<tr>' +
        '<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">' + (item.description || '') + '</td>' +
        '<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280">' + (item.category || '') + '</td>' +
        '<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center;color:#374151">' + item.quantity + '</td>' +
        '<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;color:#374151">$' + parseFloat(item.unit_price).toFixed(2) + '</td>' +
        '<td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:700;color:#111827">$' + parseFloat(item.total).toFixed(2) + '</td>' +
        '</tr>';
    }).join('');

    const termsSection = quoteTerms ?
      '<div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">' +
      '<div style="font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px;text-transform:uppercase">Terms and Conditions</div>' +
      '<div style="font-size:13px;color:#6b7280;line-height:1.6">' + quoteTerms + '</div>' +
      '</div>' : '';

    const notesSection = quote.notes ?
      '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px">' +
      '<div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:6px;text-transform:uppercase">Notes</div>' +
      '<div style="font-size:14px;color:#78350f;line-height:1.6">' + quote.notes + '</div>' +
      '</div>' : '';

    const signatureSection = emailSignature ?
      '<div style="margin-top:24px;padding-top:24px;border-top:1px solid #f3f4f6;font-size:13px;color:#6b7280;line-height:1.8">' +
      emailSignature.replace(/\n/g, '<br>') + '</div>' : '';

    const validUntil = quote.due_date ?
      '&nbsp;&nbsp;|&nbsp;&nbsp;<span style="font-size:13px;color:#6b7280">Valid Until: ' + quote.due_date + '</span>' : '';

    const phoneSection = shopPhone ? ' | ' + shopPhone : '';

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/></head>' +
      '<body style="font-family:system-ui,sans-serif;background:#f8f9fb;margin:0;padding:40px 20px">' +
      '<div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">' +

      '<div style="background:#111827;padding:28px 32px">' +
      '<table width="100%"><tr>' +
      '<td><div style="font-size:28px;display:inline-block">🚀</div>&nbsp;&nbsp;' +
      '<span style="color:white;font-size:20px;font-weight:700">' + shopName + '</span><br>' +
      '<span style="color:#9ca3af;font-size:13px">' + shopWebsite + '</span></td>' +
      '<td align="right"><span style="color:#9ca3af;font-size:12px">Quote</span><br>' +
      '<span style="color:white;font-size:16px;font-weight:700">' + quote.quote_number + '</span></td>' +
      '</tr></table></div>' +

      '<div style="padding:32px">' +
      '<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#111827">Hi ' + customer.name.split(' ')[0] + ',</h1>' +
      '<p style="font-size:15px;color:#6b7280;margin:0 0 28px;line-height:1.6">Thanks for reaching out! We have put together a quote for you. Please review the details below.</p>' +

      '<div style="background:#f8f9fb;border-radius:8px;padding:16px 20px;margin-bottom:24px">' +
      '<span style="font-size:13px;color:#374151;font-weight:600">Quote: ' + quote.quote_number + '</span>' +
      '&nbsp;&nbsp;|&nbsp;&nbsp;<span style="font-size:13px;color:#6b7280">Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</span>' +
      validUntil + '</div>' +

      '<table style="width:100%;border-collapse:collapse;margin-bottom:24px">' +
      '<thead><tr style="background:#f8f9fb">' +
      '<th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>' +
      '<th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Category</th>' +
      '<th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Qty</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Unit Price</th>' +
      '<th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Total</th>' +
      '</tr></thead><tbody>' + itemsHTML + '</tbody></table>' +

      '<div style="display:flex;justify-content:flex-end;margin-bottom:32px">' +
      '<div style="background:#111827;color:white;border-radius:8px;padding:16px 24px;text-align:right">' +
      '<div style="font-size:12px;color:#9ca3af;margin-bottom:4px">Total Amount</div>' +
      '<div style="font-size:32px;font-weight:700">$' + parseFloat(quote.total).toFixed(2) + '</div>' +
      '</div></div>' +

      notesSection +
      termsSection +

      '<div style="background:#f8f9fb;border-radius:10px;padding:24px;text-align:center;margin-bottom:8px">' +
      '<p style="font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6">Ready to move forward? Click below to accept or reject this quote in your secure customer portal.</p>' +
      '<table align="center"><tr>' +
      '<td style="padding:0 6px"><a href="' + portalUrl + '" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">Accept Quote</a></td>' +
      '<td style="padding:0 6px"><a href="' + portalUrl + '" style="display:inline-block;background:white;color:#dc2626;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;border:2px solid #fecaca">Reject Quote</a></td>' +
      '</tr></table>' +
      '<p style="font-size:12px;color:#9ca3af;margin:16px 0 0">Both buttons take you to your secure customer portal.</p>' +
      '</div>' +

      signatureSection +
      '</div>' +

      '<div style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">' +
      '<p style="font-size:13px;color:#6b7280;margin:0 0 4px">Questions? Reply to this email or contact us at <a href="mailto:' + shopEmail + '" style="color:#2563eb">' + shopEmail + '</a>' + phoneSection + '</p>' +
      '<p style="font-size:12px;color:#9ca3af;margin:0">' + shopName + ' | Powered by RocketHQ</p>' +
      '</div></div></body></html>';

    const { data, error } = await resend.emails.send({
      from: shopName + ' <quotes@rockethq.io>',
      to: customer.email,
      subject: 'Quote ' + quote.quote_number + ' from ' + shopName + ' - $' + parseFloat(quote.total).toFixed(2),
      html,
    });

    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ success: true, data });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
