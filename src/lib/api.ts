import { useState, useCallback } from 'react';

const API_URL = ''; // Relative path because of Vite proxy

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('crm_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          window.location.href = '/login';
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Request failed');
        } else {
          const text = await response.text();
          console.error('Non-JSON error response:', text);
          throw new Error(`Request failed with status ${response.status}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        console.error('Expected JSON but got:', text);
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
           throw new Error('Received HTML instead of JSON. The API route might not be found.');
        }
        throw new Error('Response was not JSON');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}
