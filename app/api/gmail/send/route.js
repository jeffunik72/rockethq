import { google } from 'googleapis';

export async function POST(request) {
  try {
    const { to, subject, body, threadId, accessToken } = await request.json();

    if (!accessToken) {
      return Response.json({ error: 'No access token' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const emailLines = [
      'To: ' + to,
      'Subject: ' + subject,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const email = emailLines.join('\n');
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: threadId || undefined,
      },
    });

    return Response.json({ success: true, id: res.data.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
