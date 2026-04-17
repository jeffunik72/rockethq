import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(request) {
  try {
    const { quote, customer, items } = await request.json();

    // Get portal token
    const { data: customerData } = await supabase
      .from('customers')
      .select('portal_token')
      .eq('id', customer.id)
      .single();

    const portalUrl = `https://portal.rockethq.io/portal/${customerData?.portal_token}`;

    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">${item.description || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280">${item.category || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center;color:#374151">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;color:#374151">$${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:700;color:#111827">$${parseFloat(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family:system-ui,sans-serif;background:#f8f9fb;margin:0;padding:40px 20px">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          
          <!-- Header -->
          <div style="background:#111827;padding:28px 32px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="font-size:28px">🚀</div>
              <div>
                <div style="color:white;font-size:20px;font-weight:700">Blue Rocket</div>
                <div style="color:#9ca3af;font-size:13px">portal.rockethq.io</div>
              </div>
              <div style="margin-left:auto;text-align:right">
                <div style="color:#9ca3af;font-size:12px;margin-bottom:2px">Quote</div>
                <div style="color:white;font-size:16px;font-weight:700">${quote.quote_number}</div>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div style="padding:32px">
            <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#111827">Hi ${customer.name.split(' ')[0]},</h1>
            <p style="font-size:15px;color:#6b7280;margin:0 0 28px;line-height:1.6">
              Thanks for reaching out! We've put together a quote for you. Please review the details below and let us know if you'd like to proceed.
            </p>

            <!-- Quote Meta -->
            <div style="background:#f8f9fb;border-radius:8px;padding:16px 20px;margin-bottom:24px;display:flex;gap:32px">
              <div>
                <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Quote Number</div>
                <div style="font-size:14px;font-weight:600;color:#111827">${quote.quote_number}</div>
              </div>
              <div>
                <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Date</div>
                <div style="font-size:14px;font-weight:600;color:#111827">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              ${quote.due_date ? `
              <div>
                <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Valid Until</div>
                <div style="font-size:14px;font-weight:600;color:#111827">${quote.due_date}</div>
              </div>` : ''}
            </div>

            <!-- Line Items -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <thead>
                <tr style="background:#f8f9fb">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Category</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Qty</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Unit Price</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;border-bottom:2px solid #e5e7eb">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHTML}</tbody>
            </table>

            <!-- Total -->
            <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
              <div style="background:#111827;color:white;border-radius:8px;padding:16px 24px;text-align:right">
                <div style="font-size:12px;color:#9ca3af;margin-bottom:4px">Total Amount</div>
                <div style="font-size:32px;font-weight:700">$${parseFloat(quote.total).toFixed(2)}</div>
              </div>
            </div>

            <!-- Notes -->
            ${quote.notes ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:28px">
              <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:6px;text-transform:uppercase">Notes</div>
              <div style="font-size:14px;color:#78350f;line-height:1.6">${quote.notes}</div>
            </div>` : ''}

            <!-- Accept / Reject Buttons -->
            <div style="background:#f8f9fb;border-radius:10px;padding:24px;text-align:center;margin-bottom:8px">
              <p style="font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.6">Ready to move forward? Click below to accept or reject this quote. You can also view full details and track your orders in your customer portal.</p>
              
              <div style="display:flex;gap:12px;justify-content:center;margin-bottom:16px">
                <a href="${portalUrl}" style="display:inline-block;background:#16a34a;color:white;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
                  ✓ Accept Quote
                </a>
                <a href="${portalUrl}" style="display:inline-block;background:white;color:#dc2626;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;border:2px solid #fecaca">
                  ✗ Reject Quote
                </a>
              </div>

              <p style="font-size:12px;color:#9ca3af;margin:0">
                Both buttons will take you to your secure customer portal where you can review and respond to this quote.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="font-size:13px;color:#6b7280;margin:0 0 4px">Questions? Reply to this email or contact us at <a href="mailto:hello@rockethq.io" style="color:#2563eb">hello@rockethq.io</a></p>
            <p style="font-size:12px;color:#9ca3af;margin:0">Blue Rocket · Powered by RocketHQ</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Blue Rocket <quotes@rockethq.io>',
      to: customer.email,
      subject: `Quote ${quote.quote_number} from Blue Rocket — $${parseFloat(quote.total).toFixed(2)}`,
      html,
    });

    if (error) return Response.json({ error }, { status: 400 });
    return Response.json({ success: true, data });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
