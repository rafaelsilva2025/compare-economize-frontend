import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationFallbackModal({ 
  open, 
  onClose, 
  onLocationObtained,
  destinationLat,
  destinationLng,
  destinationName 
}) {
  const [addressInput, setAddressInput] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isRequestingGPS, setIsRequestingGPS] = useState(false);

  // Try GPS again
  const handleTryGPSAgain = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo seu navegador');
      return;
    }

    setIsRequestingGPS(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        const timestamp = Date.now();
        
        localStorage.setItem('userLocation', JSON.stringify({
          coords,
          timestamp,
        }));
        
        setIsRequestingGPS(false);
        toast.success('Localização obtida com sucesso');
        onLocationObtained(coords);
        onClose();
      },
      (err) => {
        setIsRequestingGPS(false);
        
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Permissão negada. Tente outra opção abaixo.');
        } else if (err.code === err.TIMEOUT) {
          toast.error('Tempo esgotado ao obter localização');
        } else {
          toast.error('Não foi possível obter sua localização');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 600000,
      }
    );
  };

  // Open Google Maps with route
  const handleOpenGoogleMaps = () => {
    const destination = `${destinationLat},${destinationLng}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(mapsUrl, '_blank');
    toast.success('Google Maps aberto. A rota mostrará a distância.');
  };

  // Geocode address using Nominatim (OpenStreetMap)
  const handleCalculateDistance = async () => {
    if (!addressInput.trim()) {
      toast.error('Digite um endereço ou bairro');
      return;
    }

    setIsGeocoding(true);

    try {
      // Use Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1&countrycodes=br`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
        
        const timestamp = Date.now();
        
        // Save both coords and manual address
        localStorage.setItem('userLocation', JSON.stringify({
          coords,
          timestamp,
        }));
        
        localStorage.setItem('userLocationManual', JSON.stringify({
          address: addressInput,
          coords,
          timestamp,
        }));
        
        setIsGeocoding(false);
        toast.success('Localização encontrada!');
        onLocationObtained(coords);
        onClose();
      } else {
        // Fallback: open Google Maps with origin and destination
        setIsGeocoding(false);
        const origin = encodeURIComponent(addressInput);
        const destination = `${destinationLat},${destinationLng}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
        window.open(mapsUrl, '_blank');
        toast.info('Endereço não encontrado automaticamente. Verifique a rota no Google Maps.');
      }
    } catch (error) {
      setIsGeocoding(false);
      toast.error('Erro ao buscar endereço. Tente o Google Maps.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir sua localização</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-gray-600">
            Para calcular a distância até <span className="font-medium">{destinationName}</span>, ative o GPS ou informe sua origem.
          </p>

          {/* Try GPS Again */}
          <Button
            onClick={handleTryGPSAgain}
            disabled={isRequestingGPS}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isRequestingGPS ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Obtendo localização…
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Tentar GPS novamente
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>

          {/* Google Maps */}
          <Button
            onClick={handleOpenGoogleMaps}
            variant="outline"
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir no Google Maps
          </Button>

          <p className="text-xs text-gray-500 text-center">
            O Google Maps pode usar sua localização para calcular a rota
          </p>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">ou digite manualmente</span>
            </div>
          </div>

          {/* Manual Address Input */}
          <div className="space-y-2">
            <Input
              placeholder="Digite seu endereço ou bairro"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCalculateDistance()}
            />
            <Button
              onClick={handleCalculateDistance}
              disabled={isGeocoding || !addressInput.trim()}
              variant="outline"
              className="w-full"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculando…
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Calcular distância
                </>
              )}
            </Button>
          </div>

          {/* Cancel */}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-500"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}