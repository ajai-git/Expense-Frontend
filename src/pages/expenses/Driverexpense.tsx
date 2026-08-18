import { useEffect } from 'react';
import { useApp } from '../../store/AppContext';

export function DriverExpense() {
  const { navigate } = useApp();

  useEffect(() => {
    navigate('expenses/add');
  }, [navigate]);

  return null;
}