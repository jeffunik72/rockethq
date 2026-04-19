import { getServerSession } from 'next-auth';
import { google } from 'googleapis';

export async function GET(request) {
  try {
    const session = await getServerSession();
    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const payload = res.data.payload;
    let body = '';

    function extractBody(part) {
      if (!part) return '';
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return '<pre style="white-space:pre-wrap;font-family:inherit">' + Buffer.from(part.body.data, 'base64').toString('utf-8') + '</pre>';
      }
      if (part.parts) {
        for (const p of part.parts) {
          const result = extractBody(p);
          if (result) return result;
        }
      }
      return '';
    }

    body = extractBody(payload);
    if (!body && payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return Response.json({ body, snippet: res.data.snippet });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
