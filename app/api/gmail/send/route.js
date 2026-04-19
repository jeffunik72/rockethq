import { getServerSession } from 'next-auth';
import { google } from 'googleapis';

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session?.accessToken) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { to, subject, body, threadId } = await request.json();

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: session.accessToken });

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
