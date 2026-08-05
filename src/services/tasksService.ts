import { getGoogleAccessToken } from './calendarService';

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
}

export const getTaskLists = async (): Promise<GoogleTaskList[]> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao buscar listas de tarefas: ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
};

export const getTasks = async (listId: string = '@default'): Promise<GoogleTaskItem[]> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao buscar tarefas: ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
};

export const createGoogleTask = async (
  listId: string = '@default',
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const bodyData: any = {
    title: task.title,
  };
  if (task.notes) bodyData.notes = task.notes;

  if (task.due) {
    const d = new Date(task.due);
    bodyData.due = d.toISOString();
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao criar tarefa: ${errorData.error?.message || res.statusText}`);
  }

  return await res.json();
};

export const updateGoogleTask = async (
  listId: string = '@default',
  taskId: string,
  updates: Partial<GoogleTaskItem>
): Promise<GoogleTaskItem> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao atualizar tarefa: ${errorData.error?.message || res.statusText}`);
  }

  return await res.json();
};

export const deleteGoogleTask = async (
  listId: string = '@default',
  taskId: string
): Promise<void> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao excluir tarefa: ${errorData.error?.message || res.statusText}`);
  }
};

export const createTaskList = async (title: string): Promise<GoogleTaskList> => {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Acesso negado. Por favor, faça login com o Google.');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('google_drive_tokens');
    throw new Error('Sua sessão do Google expirou ou faltam permissões. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Erro ao criar lista: ${errorData.error?.message || res.statusText}`);
  }

  return await res.json();
};
