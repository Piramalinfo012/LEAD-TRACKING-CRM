import { useState, useEffect } from 'react';

const FILTER_EVENT = 'crm_global_filter_changed';

export function useGlobalFilter() {
  const [salesPerson, setSalesPerson] = useState<string>(() => {
    return localStorage.getItem('crm_global_sales_person') || 'ALL';
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== salesPerson) {
        setSalesPerson(customEvent.detail);
      }
    };
    window.addEventListener(FILTER_EVENT, handleSync);
    return () => window.removeEventListener(FILTER_EVENT, handleSync);
  }, [salesPerson]);

  const updateSalesPerson = (newValue: string) => {
    localStorage.setItem('crm_global_sales_person', newValue);
    setSalesPerson(newValue);
    window.dispatchEvent(new CustomEvent(FILTER_EVENT, { detail: newValue }));
  };

  return {
    salesPerson,
    setSalesPerson: updateSalesPerson
  };
}
