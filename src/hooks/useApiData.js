// src/hooks/useApiData.js

import { useState, useEffect, useCallback } from 'react';
import { queuedFetch } from '../api/jikanQueue'; // Sesuaikan path jika perlu

/**
 * Hook kustom untuk mengambil data dari Jikan API menggunakan antrean.
 * @param {string} endpoint - Endpoint API (e.g., '/anime/1')
 * @param {Array} dependencies - Dependensi untuk useEffect (e.g., [animeId])
 */
export const useApiData = (endpoint, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await queuedFetch(endpoint);
      
      setData(result);
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';
      let errorType = 'unknown';
      
      if (err.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (err.message.includes('Network error')) {
        errorType = 'network';
      } else {
        errorMessage = err.message;
      }
      
      setError({ message: errorMessage, type: errorType });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]); // Hanya 'endpoint' yang jadi dependensi utama

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, ...dependencies]); // 'dependencies' menampung animeId, dll.

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchData,
  };
};