import { google } from 'googleapis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('token');
    const maxResults = parseInt(searchParams.get('limit') || '25');
    const pageToken = searchParams.get('pageToken') || null;
    const query = searchParams.get('q') || '';

    if (!accessToken) {
      return Response.json({ error: 'No access token' }, { status: 401 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      pageToken,
      q: query,
    });

    const messages = listRes.data.messages || [];
    const pageNextToken = listRes.data.nextPageToken;

    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet,
          labelIds: detail.data.labelIds || [],
          unread: (detail.data.labelIds || []).includes('UNREAD'),
        };
      })
    );

    return Response.json({ emails: emailDetails, nextPageToken: pageNextToken });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
