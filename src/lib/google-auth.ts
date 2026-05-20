// googleapis is loaded dynamically to prevent massive cold starts on Vercel when Apps Script is used instead.

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

export async function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Google Service Account credentials not provided');
  }

  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES
  });

  return auth;
}

export async function getSheetsClient() {
  const { google } = await import('googleapis');
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function getDriveClient() {
  const { google } = await import('googleapis');
  const auth = await getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}
