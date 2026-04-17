import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { quote, customer, items } = await request.json();

    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px">${item.description || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px">${item.category || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:center">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right">$${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:14px;text-align:right;font-weight:600">$${parseFloat(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family:system-ui,sans-serif;background:#f8f9fb;margin:0;padding:40px 20px">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="background:#111827;padding:28px 32px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="font-size:28px">🚀</div>
              <div>
                <div style="color:white;font-size:20px;font-weight:700">RocketHQ</div>
                <div style="color:#9ca3af;font-size:13px">Blue Rocket</div>
              </div>
              <div style="margin-left:auto;text-align:right">
                <div style="color:#9ca3af;font-size:12px">Quote</div>
                <div style="color:white;font-size:16px;font-weight:700">${quote.quote_number}</div>
              </div>
            </div>
          </div>
          <div style="padding:32px">
            <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#111827">Hi ${customer.name},</h1>
            <p style="font-size:15px;color:#6b7280;margin:0 0 28px;line-height:1.6">Thank you for your interest! Please find your quote details below.</p>
            <div style="background:#f8f9fb;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <span style="font-size:13px;color:#374151;font-weight:600">Quote: ${quote.quote_number}</span>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <span style="font-size:13px;color:#6b7280">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              ${quote.due_date ? `&nbsp;&nbsp;|&nbsp;&nbsp;<span style="font-size:13px;color:#6b7280">Valid Until: ${quote.due_date}</span>` : ''}
            </div>
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
            <div style="text-align:right;margin-bottom:28px">
              <div style="display:inline-block;background:#111827;color:white;border-radius:8px;padding:16px 24px;text-align:right">
                <div style="font-size:12px;color:#9ca3af;margin-bottom:4px">Total Amount</div>
                <div style="font-size:28px;font-weight:700">$${parseFloat(quote.total).toFixed(2)}</div>
              </div>
            </div>
            ${quote.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px"><div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:6px">Notes</div><div style="font-size:14px;color:#78350f">${quote.notes}</div></div>` : ''}
            <div style="text-align:center;padding:24px;background:#f8f9fb;border-radius:8px">
              <p style="font-size:14px;color:#6b7280;margin:0 0 16px">Ready to move forward? Reply to this email or contact us directly.</p>
              <a href="mailto:hello@rockethq.io" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Accept Quote</a>
            </div>
          </div>
          <div style="background:#f8f9fb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="font-size:12px;color:#9ca3af;margin:0">Blue Rocket · portal.rockethq.io</p>
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
