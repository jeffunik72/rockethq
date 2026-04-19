import { google } from 'googleapis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('token');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!accessToken) return Response.json({ error: 'No token' }, { status: 401 });

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return Response.json({ events: res.data.items || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { title, date, time, endTime, description, accessToken } = await request.json();
    if (!accessToken) return Response.json({ error: 'No token' }, { status: 401 });

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    let start, end;
    if (time) {
      start = { dateTime: date + 'T' + time + ':00', timeZone: 'America/Chicago' };
      end = { dateTime: date + 'T' + (endTime || time) + ':00', timeZone: 'America/Chicago' };
    } else {
      start = { date };
      end = { date };
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: { summary: title, description, start, end },
    });

    return Response.json({ success: true, event: res.data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
