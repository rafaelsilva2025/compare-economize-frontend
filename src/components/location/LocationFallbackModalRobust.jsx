import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, RefreshCw, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationFallbackModalRobust({ 
  open, 
  onClose, 
  onRetryGPS,
  destinationLat,
  destinationLng,
  destinationName,
  onManualCoordsSet,
}) {
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleOpenMaps = () => {
    if (!destinationLat || !destinationLng) {
      toast.error('Estabelecimento sem coordenadas');
      return;
    }

    const destination = `${destinationLat},${destinationLng}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(mapsUrl, '_blank');
    toast.success('Abrindo Google Maps');
  };

  const handleCalculateDistance = async () => {
    if (!manualAddress.trim()) {
      toast.error('Digite um endereço ou bairro');
      return;
    }

    if (!destinationLat || !destinationLng) {
      toast.error('Estabelecimento sem coordenadas');
      return;
    }

    setIsGeocoding(true);

    try {
      // Try Nominatim OSM geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        // Save manual coords and trigger recalculation
        if (onManualCoordsSet) {
          onManualCoordsSet(lat, lng);
        }
        
        toast.success('Localização encontrada!');
        onClose();
      } else {
        // Geocoding failed, open Google Maps
        openGoogleMaps();
      }
    } catch (error) {
      // Geocoding failed, open Google Maps
      openGoogleMaps();
    } finally {
      setIsGeocoding(false);
    }
  };

  const openGoogleMaps = () => {
    const origin = encodeURIComponent(manualAddress);
    const destination = `${destinationLat},${destinationLng}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    
    localStorage.setItem('manualOriginText', manualAddress);
    
    window.open(mapsUrl, '_blank');
    toast.info('Abra o Maps para ver a distância e volte.');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir sua localização</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Option 1: Retry GPS */}
          <Button
            onClick={() => {
              onRetryGPS();
              onClose();
            }}
            className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar GPS novamente
          </Button>

          {/* Option 2: Open Google Maps */}
          <Button
            onClick={handleOpenMaps}
            variant="outline"
            className="w-full justify-start"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Abrir no Google Maps
          </Button>

          {/* Option 3: Manual Address with Geocoding */}
          <div className="border-t pt-4 space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Onde você está?
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Av. Paulista, São Paulo"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGeocoding) handleCalculateDistance();
                }}
                disabled={isGeocoding}
              />
              <Button 
                onClick={handleCalculateDistance}
                disabled={isGeocoding}
              >
                {isGeocoding ? 'Buscando...' : 'Calcular'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Digite seu endereço, bairro ou cidade para calcular a distância
            </p>
          </div>

          {destinationName && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Destino: {destinationName}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}