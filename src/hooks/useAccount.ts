import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

async function authFetch(
  url: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit,
): Promise<Response> {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

export function useExportData() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/user/export', getToken);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nutriapp-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useDeleteAccount() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: () => authFetch('/api/user/account', getToken, { method: 'DELETE' }),
  });
}
