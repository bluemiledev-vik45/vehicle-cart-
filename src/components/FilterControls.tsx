import React, { useEffect, useMemo, useState } from 'react';
import styles from './FilterControls.module.css';

const FilterControls: React.FC = () => {
  type Vehicle = { id: string; rego: string };
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Initialize from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deviceId = params.get('device_id');
    const date = params.get('date');
    if (deviceId) setSelectedVehicleId(deviceId);
    if (date) setSelectedDate(date);
  }, []);

  // Load vehicles from API with local fallback
  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        const apiRes = await fetch('https://www.no-reply.com.au/smart_data_link/get-vehicles', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!apiRes.ok) throw new Error('bad');
        const json = await apiRes.json();
        const payload: any = (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
        const arr: Vehicle[] = Array.isArray(payload) ? payload.map((v: any) => ({ id: String(v.id), rego: String(v.rego ?? v.name ?? v.id) })) : [];
        if (aborted) return;
        setVehicles(arr);
        if (!selectedVehicleId && arr.length) setSelectedVehicleId(arr[0].id);
      } catch {
        // Minimal hardcoded fallback if API fails
        const fallback: Vehicle[] = [];
        if (!aborted) {
          setVehicles(fallback);
        }
      }
    };
    load();
    return () => { aborted = true; };
  }, [selectedVehicleId]);

  // Fetch dates when vehicle changes
  useEffect(() => {
    let aborted = false;
    const loadDates = async () => {
      if (!selectedVehicleId) { setDates([]); setSelectedDate(''); return; }
      try {
        const url = `https://www.no-reply.com.au/smart_data_link/get-dates-by-vehicles-id?vehicles_id=${selectedVehicleId}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (!res.ok) throw new Error('bad');
        const json = await res.json();
        let arr: string[] = [];
        const payload: any = (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
        if (Array.isArray(payload)) arr = payload.map((d: any) => String(d)).filter((d: string) => d.length > 0);
        arr.sort((a, b) => b.localeCompare(a));
        if (aborted) return;
        setDates(arr);
        if (arr.length) setSelectedDate(arr[0]); else setSelectedDate('');
      } catch (e) {
        if (!aborted) { setDates([]); setSelectedDate(''); }
      }
    };
    loadDates();
    return () => { aborted = true; };
  }, [selectedVehicleId]);

  // Apply when both selected
  useEffect(() => {
    if (!selectedVehicleId || !selectedDate) return;
    const params = new URLSearchParams(window.location.search);
    params.set('device_id', selectedVehicleId);
    params.set('date', selectedDate);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new CustomEvent('filters:apply', { detail: { device_id: selectedVehicleId, date: selectedDate } }));
  }, [selectedVehicleId, selectedDate]);

  return (
    <div className={styles.filterControls}>
      <div className={styles.container}>
        <div className={styles.leftControls}>
          <h1 className={styles.title}>Charts</h1>
          
          <select 
            className={styles.select}
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.rego}</option>
            ))}
          </select>
          
          <select 
            className={styles.select}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={!selectedVehicleId}
          >
            <option value="">Select Date</option>
            {dates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <button className={styles.filterButton} onClick={() => window.dispatchEvent(new CustomEvent('filters:open'))}>Additional Filters</button>
        </div>
        
      
        
        <div className={styles.rightControls}>
          <div className={styles.actionButtons}>
            <button className={styles.actionBtn}>Table</button>
            <button className={styles.actionBtn} onClick={() => window.print()}>Print</button>
          </div>
          
        
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
