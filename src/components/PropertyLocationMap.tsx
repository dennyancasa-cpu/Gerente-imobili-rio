// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, MAPS_INTERNAL_ATTRIBUTION } from '../services/mapsConfig';

export interface AddressParsedData {
  address: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lng: number;
  placeId?: string;
}

// Inner component for handling camera moves smoothly
function MapCameraController({ center, zoom }: { center: { lat: number; lng: number }; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && center && center.lat && center.lng) {
      map.panTo(center);
      if (zoom) {
        map.setZoom(zoom);
      }
    }
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

// Inner Autocomplete Input Component
function AutocompleteInputInner({
  onSelectAddress,
  placeholder = 'Buscar endereço no Google Maps (rua, número, bairro)...',
}: {
  onSelectAddress: (data: AddressParsedData) => void;
  placeholder?: string;
}) {
  const placesLib = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!placesLib) return;

    if (!inputValue.trim() || inputValue.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: inputValue,
          sessionToken: sessionTokenRef.current,
          region: 'br',
          language: 'pt-BR',
        });
        setSuggestions(response.suggestions || []);
        setIsOpen((response.suggestions || []).length > 0);
      } catch (err) {
        console.warn('Erro ao buscar sugestões no Google Maps:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputValue, placesLib]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;

      setIsLoading(true);
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'displayName',
            'formattedAddress',
            'location',
            'addressComponents',
          ],
        });

        const loc = place.location;
        const lat = loc ? loc.lat() : 0;
        const lng = loc ? loc.lng() : 0;

        let street = '';
        let number = '';
        let neighborhood = '';
        let city = '';
        let state = '';
        let cep = '';

        if (place.addressComponents) {
          for (const comp of place.addressComponents) {
            const types = comp.types || [];
            if (types.includes('route')) {
              street = comp.longText || comp.shortText || '';
            } else if (types.includes('street_number')) {
              number = comp.longText || comp.shortText || '';
            } else if (
              types.includes('sublocality_level_1') ||
              types.includes('sublocality') ||
              types.includes('neighborhood')
            ) {
              neighborhood = comp.longText || comp.shortText || '';
            } else if (
              types.includes('administrative_area_level_2') ||
              types.includes('locality')
            ) {
              city = comp.longText || comp.shortText || '';
            } else if (types.includes('administrative_area_level_1')) {
              state = comp.shortText || comp.longText || '';
            } else if (types.includes('postal_code')) {
              const rawCep = (comp.longText || comp.shortText || '').replace(/\D/g, '');
              if (rawCep.length === 8) {
                cep = rawCep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
              } else {
                cep = comp.longText || comp.shortText || '';
              }
            }
          }
        }

        const formatted = place.formattedAddress || suggestion.placePrediction.text?.text || '';

        onSelectAddress({
          address: formatted,
          street,
          number,
          neighborhood,
          city,
          state,
          cep,
          lat,
          lng,
          placeId: place.id,
        });

        setInputValue('');
        setIsOpen(false);
        setSuggestions([]);
        sessionTokenRef.current = null; // Reset session token per best practice
      } catch (err) {
        console.error('Erro ao obter detalhes do local:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [placesLib, onSelectAddress]
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-indigo-500 pointer-events-none">
          <Search className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-indigo-200 rounded-xl text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white shadow-sm transition-all"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-semibold"
          >
            Limpar
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {suggestions.map((s, idx) => {
            const mainText = s.placePrediction?.mainText?.text || s.placePrediction?.text?.text || '';
            const secondaryText = s.placePrediction?.secondaryText?.text || '';
            return (
              <li
                key={idx}
                onMouseDown={() => handleSelectSuggestion(s)}
                className="px-3 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-start gap-2.5 transition-colors"
              >
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-slate-800 truncate">
                    {mainText}
                  </p>
                  {secondaryText && (
                    <p className="text-[11px] text-slate-500 truncate">{secondaryText}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Inner Map Viewer Component
function PropertyMapInner({
  lat,
  lng,
  address,
  title,
  height = '240px',
  interactive = true,
  allowPinAdjustment = false,
  onCoordinateChange,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  title?: string;
  height?: string;
  interactive?: boolean;
  allowPinAdjustment?: boolean;
  onCoordinateChange?: (lat: number, lng: number) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );
  const [isSearchingText, setIsSearchingText] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync coords from props
  useEffect(() => {
    if (lat && lng) {
      setCurrentCoords({ lat, lng });
    }
  }, [lat, lng]);

  // If no coordinates provided, try to search by text using Places API (New)
  useEffect(() => {
    if (currentCoords || !address || !placesLib) return;

    let isMounted = true;
    const findCoords = async () => {
      setIsSearchingText(true);
      try {
        const { Place } = placesLib;
        const res = await Place.searchByText({
          textQuery: address,
          fields: ['location', 'displayName', 'formattedAddress'],
        });
        if (isMounted && res.places && res.places.length > 0 && res.places[0].location) {
          const loc = res.places[0].location;
          const found = { lat: loc.lat(), lng: loc.lng() };
          setCurrentCoords(found);
          if (onCoordinateChange) {
            onCoordinateChange(found.lat, found.lng);
          }
        }
      } catch (err) {
        console.warn('Busca de coordenadas por texto falhou:', err);
      } finally {
        if (isMounted) setIsSearchingText(false);
      }
    };

    findCoords();
    return () => {
      isMounted = false;
    };
  }, [address, placesLib, currentCoords, onCoordinateChange]);

  const defaultCenter = currentCoords || { lat: -23.55052, lng: -46.633308 }; // São Paulo default

  const handleMapClick = (e: any) => {
    if (!allowPinAdjustment || !onCoordinateChange) return;
    if (e.detail && e.detail.latLng) {
      const newLat = e.detail.latLng.lat;
      const newLng = e.detail.latLng.lng;
      setCurrentCoords({ lat: newLat, lng: newLng });
      onCoordinateChange(newLat, newLng);
    }
  };

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGoogleMaps = () => {
    let url = 'https://www.google.com/maps/search/?api=1';
    if (currentCoords) {
      url += `&query=${currentCoords.lat},${currentCoords.lng}`;
    } else if (address) {
      url += `&query=${encodeURIComponent(address)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openRoutes = () => {
    let url = 'https://www.google.com/maps/dir/?api=1';
    if (currentCoords) {
      url += `&destination=${currentCoords.lat},${currentCoords.lng}`;
    } else if (address) {
      url += `&destination=${encodeURIComponent(address)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm flex flex-col group">
      {/* Map surface with strict explicit height */}
      <div style={{ height, width: '100%' }} className="relative">
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={MAPS_INTERNAL_ATTRIBUTION}
          defaultCenter={defaultCenter}
          defaultZoom={currentCoords ? 16 : 12}
          gestureHandling={interactive ? 'cooperative' : 'none'}
          disableDefaultUI={!interactive}
          zoomControl={interactive}
          mapTypeControl={interactive}
          streetViewControl={interactive}
          onClick={handleMapClick}
        >
          {currentCoords && (
            <>
              <MapCameraController center={currentCoords} zoom={16} />
              <AdvancedMarker
                position={currentCoords}
                title={title || address || 'Localização do Imóvel'}
              >
                <Pin
                  background="#4f46e5"
                  borderColor="#312e81"
                  glyphColor="#ffffff"
                  scale={1.2}
                />
              </AdvancedMarker>
            </>
          )}
        </Map>

        {isSearchingText && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 text-xs text-slate-700">
              <Compass className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Localizando endereço no mapa...</span>
            </div>
          </div>
        )}

        {allowPinAdjustment && (
          <div className="absolute top-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-medium shadow pointer-events-none">
            📍 Clique no mapa para ajustar a posição do pin
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-full">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate font-medium text-[11px] md:text-xs">
            {address || (currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : 'Localização')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {address && (
            <button
              type="button"
              onClick={handleCopyAddress}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
              title="Copiar endereço"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={openRoutes}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors"
            title="Traçar rota para o imóvel"
          >
            <Navigation className="w-3 h-3 text-indigo-600" />
            <span>Como chegar</span>
          </button>

          <button
            type="button"
            onClick={openGoogleMaps}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            title="Abrir no Google Maps oficial"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Abrir no Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Exported high-level components wrapped in APIProvider
export function PropertyLocationSearch({
  onSelectAddress,
  placeholder,
}: {
  onSelectAddress: (data: AddressParsedData) => void;
  placeholder?: string;
}) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker']}>
      <AutocompleteInputInner onSelectAddress={onSelectAddress} placeholder={placeholder} />
    </APIProvider>
  );
}

export function PropertyLocationMapViewer({
  lat,
  lng,
  address,
  title,
  height,
  interactive = true,
  allowPinAdjustment = false,
  onCoordinateChange,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  title?: string;
  height?: string;
  interactive?: boolean;
  allowPinAdjustment?: boolean;
  onCoordinateChange?: (lat: number, lng: number) => void;
}) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker']}>
      <PropertyMapInner
        lat={lat}
        lng={lng}
        address={address}
        title={title}
        height={height}
        interactive={interactive}
        allowPinAdjustment={allowPinAdjustment}
        onCoordinateChange={onCoordinateChange}
      />
    </APIProvider>
  );
}
