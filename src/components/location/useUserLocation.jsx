import { useState, useEffect } from 'react';

// Haversine formula to calculate distance between two coordinates
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

const LOCATION_CACHE_KEY = 'userLocation';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 600000, // 10 minutes
};

export const useUserLocation = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'granted' | 'denied' | 'error'
  const [coords, setCoords] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage('not supported');
      return;
    }

    // Check cache first
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      try {
        const { coords: cachedCoords, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_DURATION) {
          // Use cached location immediately
          setCoords(cachedCoords);
          setStatus('granted');
          setLastUpdatedAt(timestamp);
          
          // Still try to update in background silently
          updateLocationSilently();
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fresh request
      }
    }

    // Get fresh location
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        const timestamp = Date.now();
        
        // Cache the location
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
          coords: newCoords,
          timestamp,
        }));
        
        setCoords(newCoords);
        setStatus('granted');
        setLastUpdatedAt(timestamp);
        setErrorMessage(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMessage('permission denied');
        } else if (err.code === err.TIMEOUT) {
          setStatus('error');
          setErrorMessage('timeout');
        } else {
          setStatus('error');
          setErrorMessage(err.message || 'unknown error');
        }
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  // Silent background update
  const updateLocationSilently = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        const timestamp = Date.now();
        
        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
          coords: newCoords,
          timestamp,
        }));
        
        setCoords(newCoords);
        setLastUpdatedAt(timestamp);
      },
      () => {
        // Silent failure, keep using cached coords
      },
      GEOLOCATION_OPTIONS
    );
  };

  return { 
    status, 
    coords, 
    errorMessage, 
    lastUpdatedAt,
    // Legacy compatibility
    location: coords,
    loading: status === 'loading' || status === 'idle',
    error: errorMessage,
  };
};

export const getDistanceFromUser = (userLocation, placeLatitude, placeLongitude) => {
  if (!userLocation || !placeLatitude || !placeLongitude) {
    return null;
  }
  
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    placeLatitude,
    placeLongitude
  );
};