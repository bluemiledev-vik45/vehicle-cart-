import React, { useState, useEffect } from 'react';
import styles from './AssetSelectionModal.module.css';

interface Vehicle {
  id: number;
  name: string;
}

interface AssetSelectionModalProps {
  onShowGraph: (vehicleId: number, date: string) => void;
}

const AssetSelectionModal: React.FC<AssetSelectionModalProps> = ({ onShowGraph }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true);
  const [loadingDates, setLoadingDates] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch vehicles on mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);
        setError(''); // Clear previous errors
        
        // Vehicles endpoint
        const apiUrl = 'https://www.no-reply.com.au/smart_data_link/get-vehicles';
        console.log('🔗 Fetching vehicles from:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store',
          mode: 'cors'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const json = await response.json();
        console.log('✅ Vehicles API response:', json);
        
        // Handle different response formats
        let vehiclesData: Vehicle[] = [];
        if (Array.isArray(json)) {
          vehiclesData = json;
        } else if (Array.isArray(json.data)) {
          vehiclesData = json.data;
        } else if (json.vehicles && Array.isArray(json.vehicles)) {
          vehiclesData = json.vehicles;
        } else if (json.result && Array.isArray(json.result)) {
          vehiclesData = json.result;
        }
        
        // Ensure vehicles have required fields
        vehiclesData = vehiclesData
          .filter((v: any) => v && (v.id !== undefined || v.vehicle_id !== undefined))
          .map((v: any) => ({
            id: v.id || v.vehicle_id || v.device_id,
            name: v.name || v.vehicle_name || v.device_name || `Vehicle ${v.id || v.vehicle_id || v.device_id}`
          }));
        
        console.log('📋 Processed vehicles:', vehiclesData);
        
        if (vehiclesData.length === 0) {
          throw new Error('No vehicles found in API response');
        }
        
        setVehicles(vehiclesData);
        if (vehiclesData.length > 0) {
          setSelectedVehicleId(vehiclesData[0].id);
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to load vehicles. Please check the API endpoint.';
        setError(errorMsg);
        console.error('❌ Error fetching vehicles:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack
        });
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  // Fetch dates when vehicle is selected
  useEffect(() => {
    if (selectedVehicleId) {
      const fetchDates = async () => {
        try {
          setLoadingDates(true);
          setSelectedDate(''); // Reset date when vehicle changes
          setError(''); // Clear previous errors
          
          // Use the API endpoint with vehicles_id parameter
          const apiUrl = `https://www.no-reply.com.au/smart_data_link/get-dates-by-vehicles-id?vehicles_id=${selectedVehicleId}`;
          console.log('🔗 Fetching dates from:', apiUrl);
          
          const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
            mode: 'cors'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const json = await response.json();
          console.log('✅ Dates API response:', json);
          
          // Handle different possible response formats
          let datesData: string[] = [];
          if (Array.isArray(json)) {
            datesData = json;
          } else if (Array.isArray(json.data)) {
            datesData = json.data;
          } else if (json.dates && Array.isArray(json.dates)) {
            datesData = json.dates;
          } else if (json.result && Array.isArray(json.result)) {
            datesData = json.result;
          } else if (json.date && Array.isArray(json.date)) {
            datesData = json.date;
          }
          
          // Ensure dates are strings and sort them (newest first)
          datesData = datesData
            .map((d: any) => String(d))
            .filter((d: string) => d.length > 0)
            .sort((a: string, b: string) => b.localeCompare(a)); // Sort descending (newest first)
          
          console.log('📅 Processed dates:', datesData);
          
          // Don't show error if no dates found, just set empty array
          setDates(datesData);
          setError(''); // Clear any previous errors on successful fetch
        } catch (err: any) {
          // Only show error for actual API failures, not for empty responses
          const errorMsg = err.message || 'Failed to load dates. Please check the API endpoint.';
          // Don't show error for "No dates found" - just log it
          if (!errorMsg.includes('No dates found')) {
            setError(errorMsg);
          } else {
            setError('');
          }
          console.error('❌ Error fetching dates:', err);
          console.error('Error details:', {
            message: err.message,
            stack: err.stack,
            vehicleId: selectedVehicleId
          });
          setDates([]);
        } finally {
          setLoadingDates(false);
        }
      };
      fetchDates();
    } else {
      setDates([]);
      setSelectedDate('');
    }
  }, [selectedVehicleId]);

  const handleShowGraph = () => {
    if (selectedVehicleId && selectedDate) {
      onShowGraph(selectedVehicleId, selectedDate);
    }
  };

  const isFormValid = selectedVehicleId !== null && selectedDate !== '';

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Asset Chart</h2>
        <p className={styles.modalInstruction}>
          Kindly select the asset and date you'd like to proceed with.
        </p>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Select Asset</label>
          <select
            className={styles.select}
            value={selectedVehicleId || ''}
            onChange={(e) => {
              setSelectedVehicleId(Number(e.target.value));
              setError(''); // Clear error when vehicle changes
            }}
            disabled={loadingVehicles}
          >
            <option value="">Select Asset</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Select Date</label>
          <select
            className={styles.select}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={loadingDates || !selectedVehicleId}
          >
            <option value="">Select Date</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
          {loadingDates && selectedVehicleId && (
            <div className={styles.loadingText}>Loading dates...</div>
          )}
        </div>

        <button
          className={styles.showButton}
          onClick={handleShowGraph}
          disabled={!isFormValid || loadingVehicles || loadingDates}
        >
          Show Graph
        </button>
      </div>
    </div>
  );
};

export default AssetSelectionModal;

