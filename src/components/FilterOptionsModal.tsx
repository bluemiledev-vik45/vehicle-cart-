import React, { useEffect, useState } from 'react';
import styles from './AssetSelectionModal.module.css';

export interface ReadingItem {
  id: string;
  name: string;
}

interface FilterOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedDigital: Record<string, boolean>, selectedAnalog: Record<string, boolean>) => void;
  initialDigital: Record<string, boolean>;
  initialAnalog: Record<string, boolean>;
}

const FilterOptionsModal: React.FC<FilterOptionsModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialDigital,
  initialAnalog,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [digitalReadings, setDigitalReadings] = useState<ReadingItem[]>([]);
  const [analogReadings, setAnalogReadings] = useState<ReadingItem[]>([]);
  const [selectedDigital, setSelectedDigital] = useState<Record<string, boolean>>(initialDigital || {});
  const [selectedAnalog, setSelectedAnalog] = useState<Record<string, boolean>>(initialAnalog || {});

  useEffect(() => {
    setSelectedDigital(initialDigital || {});
    setSelectedAnalog(initialAnalog || {});
  }, [initialDigital, initialAnalog]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchReadings = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://no-reply.com.au/smart_data_link/manual_readings', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          mode: 'cors',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const json = await res.json();
        const data = json?.data || json;
        const digital = (data?.digital_readings || []).map((r: any) => ({ id: String(r.id), name: String(r.name) }));
        const analog = (data?.analog_readings || []).map((r: any) => ({ id: String(r.id), name: String(r.name) }));
        setDigitalReadings(digital);
        setAnalogReadings(analog);
        // Initialize selections to true if not set
        if (Object.keys(initialDigital || {}).length === 0) {
          const map: Record<string, boolean> = {};
          digital.forEach((d: ReadingItem) => { map[d.id] = true; });
          setSelectedDigital(map);
        }
        if (Object.keys(initialAnalog || {}).length === 0) {
          const map: Record<string, boolean> = {};
          analog.forEach((a: ReadingItem) => { map[a.id] = true; });
          setSelectedAnalog(map);
        }
      } catch (e) {
        console.error('Failed to load manual readings', e);
        setDigitalReadings([]);
        setAnalogReadings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReadings();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAll = (type: 'digital' | 'analog', checked: boolean) => {
    if (type === 'digital') {
      const map: Record<string, boolean> = {};
      digitalReadings.forEach(d => (map[d.id] = checked));
      setSelectedDigital(map);
    } else {
      const map: Record<string, boolean> = {};
      analogReadings.forEach(a => (map[a.id] = checked));
      setSelectedAnalog(map);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 className={styles.modalTitle}>Filter Options</h2>
        {loading && <div>Loading filters...</div>}

        <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, background: '#eee', padding: '6px 8px', borderRadius: 4 }}>Digital Readings</div>
        <div style={{ marginBottom: 8 }}>
          <label><input type="checkbox" checked={Object.values(selectedDigital).every(Boolean)} onChange={(e) => toggleAll('digital', e.target.checked)} /> Select All</label>
        </div>
        <div>
          {digitalReadings.map(item => (
            <div key={item.id} style={{ marginBottom: 6 }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedDigital[item.id] ?? true}
                  onChange={(e) => setSelectedDigital(prev => ({ ...prev, [item.id]: e.target.checked }))}
                />{' '}
                {item.name} ({item.id})
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 600, background: '#eee', padding: '6px 8px', borderRadius: 4 }}>Analogue Readings</div>
        <div style={{ marginBottom: 8 }}>
          <label><input type="checkbox" checked={Object.values(selectedAnalog).every(Boolean)} onChange={(e) => toggleAll('analog', e.target.checked)} /> Select All</label>
        </div>
        <div>
          {analogReadings.map(item => (
            <div key={item.id} style={{ marginBottom: 6 }}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedAnalog[item.id] ?? true}
                  onChange={(e) => setSelectedAnalog(prev => ({ ...prev, [item.id]: e.target.checked }))}
                />{' '}
                {item.name} ({item.id})
              </label>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className={styles.showButton} onClick={() => onApply(selectedDigital, selectedAnalog)}>Apply</button>
          <button className={styles.showButton} onClick={onClose} style={{ backgroundColor: '#6b7280' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default FilterOptionsModal;


