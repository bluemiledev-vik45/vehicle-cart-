import React, { useEffect, useMemo, useState } from 'react';
import styles from './FilterControls.module.css';

const FilterControls: React.FC = () => {
  type Vehicle = { id: string; rego: string };
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Don't initialize from URL params - user must select from AssetSelectionModal

  // Load vehicles from API with local fallback
  useEffect(() => {
    let aborted = false;
    const load = async () => {
      try {
        // Fetch from reet_python vehicles API (via proxy)
        const apiRes = await fetch('/reet_python/get_vehicles.php', { headers: { 'Accept': 'application/json' }, cache: 'no-store', mode: 'cors' });
        if (!apiRes.ok) {
          const errorText = await apiRes.text().catch(() => 'Unable to read error response');
          console.error('❌ FilterControls Vehicles API Error:', errorText.substring(0, 500));
          throw new Error(`HTTP ${apiRes.status}: ${apiRes.statusText}`);
        }
        
        // Get response as text first to check if it's actually JSON
        const text = await apiRes.text();
        const contentType = apiRes.headers.get('content-type');
        
        // Check if response is actually JSON (even if Content-Type is wrong)
        let json: any;
        try {
          json = JSON.parse(text);
          console.log('✅ FilterControls: Successfully parsed vehicles JSON (Content-Type was:', contentType, ')');
        } catch (parseError) {
          if (text.includes('<!doctype') || text.includes('<html')) {
            console.error('❌ FilterControls: Vehicles API returned HTML. Content-Type:', contentType);
            console.error('❌ Response body (first 500 chars):', text.substring(0, 500));
            throw new Error(`API returned HTML instead of JSON`);
          } else {
            console.error('❌ FilterControls: Vehicles API invalid JSON. Content-Type:', contentType);
            throw new Error(`API returned invalid JSON`);
          }
        }
        // Map response: [{ devices_serial_no: "6363299" }, ...]
        const arr: Vehicle[] = Array.isArray(json)
          ? json.map((v: any) => String(v?.devices_serial_no || ''))
              .filter((s: string) => s.length > 0)
              .map((serial: string) => ({ id: serial, rego: serial }))
          : [];
        if (aborted) return;
        setVehicles(arr);
        // Don't auto-select - user must select from AssetSelectionModal first
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
        // Fetch from reet_python dates API using devices_serial_no (via proxy)
        const url = `/reet_python/get_vehicle_dates.php?devices_serial_no=${selectedVehicleId}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store', mode: 'cors' });
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unable to read error response');
          console.error('❌ FilterControls Dates API Error:', errorText.substring(0, 500));
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        // Get response as text first to check if it's actually JSON
        const text = await res.text();
        const contentType = res.headers.get('content-type');
        
        // Check if response is actually JSON (even if Content-Type is wrong)
        let json: any;
        try {
          json = JSON.parse(text);
          console.log('✅ FilterControls: Successfully parsed dates JSON (Content-Type was:', contentType, ')');
        } catch (parseError) {
          if (text.includes('<!doctype') || text.includes('<html')) {
            console.error('❌ FilterControls: Dates API returned HTML. Content-Type:', contentType);
            console.error('❌ Response body (first 500 chars):', text.substring(0, 500));
            throw new Error(`API returned HTML instead of JSON`);
          } else {
            console.error('❌ FilterControls: Dates API invalid JSON. Content-Type:', contentType);
            throw new Error(`API returned invalid JSON`);
          }
        }
        // Map response: [{ date: "YYYY-MM-DD" }, ...]
        let arr: string[] = Array.isArray(json) ? json.map((o: any) => String(o?.date || '')) : [];
        arr = arr.filter((d: string) => d.length > 0);
        arr.sort((a, b) => b.localeCompare(a));
        if (aborted) return;
        setDates(arr);
        // Don't auto-select date - user must select from AssetSelectionModal first
      } catch (e) {
        if (!aborted) { setDates([]); setSelectedDate(''); }
      }
    };
    loadDates();
    return () => { aborted = true; };
  }, [selectedVehicleId]);

  // Don't automatically dispatch filters:apply - only dispatch when user explicitly applies filters
  // The AssetSelectionModal will handle the initial selection via handleShowGraph

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
