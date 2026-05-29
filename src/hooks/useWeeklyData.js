import { useState, useEffect, useCallback } from 'react';

// 로컬: 빈 문자열(Vite 프록시 or 상대경로), 배포: 자동으로 같은 도메인 사용
const API = import.meta.env.VITE_API_URL || '';

export function useWeeklyData() {
  const [data, setData] = useState(null);   // { members, sheetName, lastSync }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/weekly`);
      if (!res.ok) throw new Error(`서버 오류 ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export async function triggerSync() {
  const res = await fetch(`${API}/api/sync`, { method: 'POST' });
  return res.json();
}
