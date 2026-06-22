import { auth } from '../firebase';

export const getGoogleAccessToken = async (): Promise<string | null> => {
  try {
    const tokensStr = localStorage.getItem('google_drive_tokens');
    if (tokensStr) {
      const tokens = JSON.parse(tokensStr);
      if (tokens.access_token) {
         return tokens.access_token;
      }
    }
    // Alternatively, fetch from currently signed-in user if token is fresh enough
    // But in Auth.tsx it saves the credential.accessToken to localstorage via 'google_drive_tokens'
  } catch (error) {
    console.error('Error getting access token', error);
  }
  return null;
};

export const createCalendarEvent = async (
  title: string,
  description: string,
  dateIso: string
) => {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado pelo Google ou permissões ausentes.');
  }

  const startDate = new Date(dateIso);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1); // For all-day events, end date must be exclusive

  const event = {
    summary: title,
    description: description,
    start: {
      date: startDate.toISOString().split('T')[0],
    },
    end: {
      date: endDate.toISOString().split('T')[0],
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('google_drive_tokens');
      throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Falha ao criar evento no calendário: ${errorData.error?.message || 'Erro desconhecido'}`);
  }

  return await response.json();
};

export const listUpcomingEvents = async () => {
    const token = await getGoogleAccessToken();
    if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google novamente.');
    const timeMin = new Date().toISOString();
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=10&orderBy=startTime&singleEvents=true`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('google_drive_tokens');
        throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
    }

    if (!response.ok) throw new Error('Falha ao obter eventos');
    return await response.json();
}
