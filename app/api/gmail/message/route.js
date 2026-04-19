import { google } from 'googleapis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accessToken = searchParams.get('token');

    if (!accessToken) {
      return Response.json({ error: 'No access token' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const payload = res.data.payload;
    let htmlBody = '';
    let plainBody = '';

    function extractParts(part) {
      if (!part) return;
      
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        plainBody = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
      
      if (part.parts) {
        part.parts.forEach(p => extractParts(p));
      }
    }

    extractParts(payload);

    // If no parts found check body directly
    if (!htmlBody && !plainBody && payload?.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        htmlBody = decoded;
      } else {
        plainBody = decoded;
      }
    }

    const body = htmlBody || (plainBody ? '<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151">' + plainBody + '</pre>' : '');

    return Response.json({ body, snippet: res.data.snippet });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
