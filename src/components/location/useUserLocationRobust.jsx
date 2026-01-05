import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'userCoordsCache';
const MANUAL_COORDS_KEY = 'userManualCoords';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Haversine formula to calculate distance
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useUserLocationRobust = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'requesting' | 'watching' | 'granted' | 'fallback'
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Load from cache or manual coords on mount
  useEffect(() => {
    // First try GPS cache (10 min)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { lat, lng, ts } = JSON.parse(cached);
        const age = Date.now() - ts;
        
        if (age < CACHE_DURATION) {
          setCoords({ latitude: lat, longitude: lng });
          setStatus('granted');
          setLastUpdatedAt(ts);
          setIsFromCache(true);
          return;
        }
      } catch (e) {
        // Invalid cache
      }
    }
    
    // Then try manual coords (no expiration)
    const manual = localStorage.getItem(MANUAL_COORDS_KEY);
    if (manual) {
      try {
        const { lat, lng, ts } = JSON.parse(manual);
        setCoords({ latitude: lat, longitude: lng });
        setStatus('granted');
        setLastUpdatedAt(ts);
        setIsFromCache(false);
      } catch (e) {
        // Invalid manual coords
      }
    }
  }, []);

  const saveToCache = useCallback((newCoords) => {
    const ts = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      lat: newCoords.latitude,
      lng: newCoords.longitude,
      ts,
    }));
    setCoords(newCoords);
    setStatus('granted');
    setLastUpdatedAt(ts);
    setIsFromCache(false);
  }, []);

  const saveManualCoords = useCallback((lat, lng) => {
    const ts = Date.now();
    localStorage.setItem(MANUAL_COORDS_KEY, JSON.stringify({ lat, lng, ts }));
    setCoords({ latitude: lat, longitude: lng });
    setStatus('granted');
    setLastUpdatedAt(ts);
    setIsFromCache(false);
  }, []);

  const requestLocationRobust = useCallback((marketId = null) => {
    if (!navigator.geolocation) {
      setStatus('idle');
      setError({ code: 'NO_SUPPORT', message: 'Geolocalização não suportada' });
      if (marketId) {
        incrementFailCount(marketId);
      }
      return Promise.reject('NO_SUPPORT');
    }

    setStatus('requesting');
    setError(null);

    return new Promise((resolve, reject) => {
      // Try getCurrentPosition
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          saveToCache(newCoords);
          resolve(newCoords);
        },
        (err) => {
          // GPS failed, stay on idle and keep link visible
          setStatus('idle');
          setError({ code: err.code, message: 'GPS não disponível' });
          
          if (marketId) {
            incrementFailCount(marketId);
          }
          
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  }, [saveToCache]);

  const incrementFailCount = (marketId) => {
    const key = `distanceFailCount:${marketId}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, (current + 1).toString());
  };

  const getFailCount = (marketId) => {
    const key = `distanceFailCount:${marketId}`;
    return parseInt(localStorage.getItem(key) || '0');
  };

  const cancelRequest = useCallback(() => {
    setStatus(coords ? 'granted' : 'idle');
  }, [coords]);

  const resetToIdle = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    coords,
    error,
    lastUpdatedAt,
    isFromCache,
    requestLocationRobust,
    cancelRequest,
    resetToIdle,
    saveManualCoords,
    getFailCount,
    calculateDistance,
  };
};

export { calculateDistance };