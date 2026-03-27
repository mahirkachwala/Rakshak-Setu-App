import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Navigation, Clock, IndianRupee,
  Building2, Filter, LocateFixed, X, List, Map as MapIcon,
  AlertCircle, Loader2, CalendarPlus, Mic
} from 'lucide-react';
import BookingModal from '@/components/BookingModalConnected';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useAppStore } from '@/store';
import { getVoicePrompt } from '@/lib/voicePrompts';
import { captureSpeechWithBrowser } from '@/lib/voice';
import { useTranslation } from '@/lib/i18n';
import {
  getCentersCopy,
  getCentersTypeOptions,
  matchesCentersCommand,
  matchCentersType,
  type CentersType,
} from '@/lib/centersLocale';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Facility {
  id: string;
  name: string;
  type: string;
  facilityType: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  isFree: boolean;
  openHours: string;
  vaccinesAvailable: string[];
  district?: string;
  state?: string;
  ward?: string;
  distance?: number;
  phone?: string;
  pincode?: string;
  source?: string;
}

// Color config by facility type
const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  phc:              { label: 'PHC',      color: 'text-green-700',  bg: 'bg-green-100',  dot: '#16a34a', border: 'border-green-200' },
  uphc:             { label: 'UPHC',     color: 'text-blue-700',   bg: 'bg-blue-100',   dot: '#1d4ed8', border: 'border-blue-200' },
  chc:              { label: 'CHC',      color: 'text-indigo-700', bg: 'bg-indigo-100', dot: '#4338ca', border: 'border-indigo-200' },
  uchc:             { label: 'UCHC',     color: 'text-violet-700', bg: 'bg-violet-100', dot: '#6d28d9', border: 'border-violet-200' },
  major_hospital:   { label: 'Hospital', color: 'text-red-700',    bg: 'bg-red-100',    dot: '#dc2626', border: 'border-red-200' },
  peripheral_hospital: { label: 'Hospital', color: 'text-orange-700', bg: 'bg-orange-100', dot: '#c2410c', border: 'border-orange-200' },
  basti_dawakhana:  { label: 'Dawakhana',color: 'text-amber-700',  bg: 'bg-amber-100',  dot: '#b45309', border: 'border-amber-200' },
  ayush:            { label: 'Ayush',    color: 'text-emerald-700',bg: 'bg-emerald-100',dot: '#059669', border: 'border-emerald-200' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: 'Centre', color: 'text-primary', bg: 'bg-primary/10', dot: '#4F46E5', border: 'border-primary/20' };
}

function createCustomIcon(type: string, isSelected = false) {
  const { dot } = getTypeConfig(type);
  const size = isSelected ? 20 : 12;
  const border = isSelected ? '3px solid white' : '2.5px solid white';
  const shadow = isSelected
    ? `0 0 0 3px ${dot}55, 0 2px 8px rgba(0,0,0,0.5)`
    : '0 1px 4px rgba(0,0,0,0.4)';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${dot};border:${border};
      box-shadow:${shadow};
      transition:all 0.2s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:#4F46E5;border:3px solid white;
      box-shadow:0 0 0 3px rgba(79,70,229,0.3),0 2px 8px rgba(0,0,0,0.3);
      animation:pulse 2s ease infinite;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// Sub-component to fly map to user location
function LocationFlyTo({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (userPos) map.flyTo(userPos, 13, { animate: true, duration: 1.5 });
  }, [userPos]);
  return null;
}

// Sub-component to fly to selected facility
function FlyToFacility({ facility }: { facility: Facility | null }) {
  const map = useMap();
  useEffect(() => {
    if (facility) map.flyTo([facility.lat, facility.lng], 16, { animate: true, duration: 1 });
  }, [facility]);
  return null;
}

function MapResizeFix({ markerCount, mapView }: { markerCount: number; mapView: boolean }) {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [map, markerCount, mapView]);

  return null;
}

const DEFAULT_INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const MAX_VISIBLE_FACILITIES = 60;
const MAX_LIST_FACILITIES = 16;
const MAX_MAP_FACILITIES = 40;

function normalizeSpeechText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getLocalizedCityLabel(city: string, copy: ReturnType<typeof getCentersCopy>): string {
  return city;
}

function getFacilityDisplayType(facility: Facility): CentersType {
  const normalizedFacilityType = facility.facilityType.toLowerCase();
  if (facility.type === 'phc' || normalizedFacilityType.includes('primary')) return 'PHC';
  if (facility.type === 'uphc' || normalizedFacilityType.includes('urban phc')) return 'UPHC';
  if (facility.type === 'chc' || normalizedFacilityType.includes('community')) return 'CHC';
  if (facility.type === 'uchc' || normalizedFacilityType.includes('urban chc')) return 'UCHC';
  if (facility.type === 'basti_dawakhana' || normalizedFacilityType.includes('dawakhana')) return 'Dawakhana';
  if (facility.type === 'ayush' || normalizedFacilityType.includes('ayush')) return 'Ayush';
  return 'Hospital';
}

export default function Centers() {
  const language = useAppStore((state) => state.language);
  const copy = useMemo(() => getCentersCopy(language), [language]);
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<CentersType>('All');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [mapView, setMapView] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [bookingFacility, setBookingFacility] = useState<Facility | null>(null);
  const [guidePrompt, setGuidePrompt] = useState(() => getVoicePrompt(language, 'centers'));
  const [guideReplayToken, setGuideReplayToken] = useState(0);
  const [voiceSearching, setVoiceSearching] = useState(false);
  // Load facility data
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}health-facilities.json`)
      .then(r => r.json())
      .then((data: Facility[]) => {
        setAllFacilities(
          data.filter((facility) => Number.isFinite(facility.lat) && Number.isFinite(facility.lng))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Request user location
  const requestLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(copy.locationUnsupported);
      setLocationLoading(false);
      setGuidePrompt(copy.locationUnsupported);
      setGuideReplayToken((value) => value + 1);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocationLoading(false);
        setGuidePrompt(copy.locationReady);
        setGuideReplayToken((value) => value + 1);
      },
      (err) => {
        setLocationError(copy.locationDenied);
        setLocationLoading(false);
        setGuidePrompt(copy.locationDenied);
        setGuideReplayToken((value) => value + 1);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Filter + sort facilities
  const filtered = useMemo(() => {
    let res = allFacilities;
    if (selectedType !== 'All') res = res.filter(f => f.type === selectedType || f.facilityType.toLowerCase().includes(selectedType.toLowerCase()));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter((facility) =>
        [
          facility.name,
          facility.address,
          facility.facilityType,
          facility.city,
          facility.district,
          facility.state,
          facility.pincode,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    if (userPos) {
      res = res
        .map((facility) => ({
          ...facility,
          distance: haversineDistance(userPos[0], userPos[1], facility.lat, facility.lng),
        }))
        .sort((left, right) => (left.distance || Number.POSITIVE_INFINITY) - (right.distance || Number.POSITIVE_INFINITY));
    }
    return res;
  }, [allFacilities, selectedType, searchTerm, userPos]);

  const renderedFacilities = useMemo(() => {
    const visible = filtered.slice(0, MAX_VISIBLE_FACILITIES);
    if (selectedFacility && !visible.some((facility) => facility.id === selectedFacility.id)) {
      return [selectedFacility, ...visible.slice(0, MAX_VISIBLE_FACILITIES - 1)];
    }
    return visible;
  }, [filtered, selectedFacility]);

  const shouldShowMapMarkers = Boolean(userPos || searchTerm.trim() || selectedType !== 'All' || selectedFacility);
  const mapFacilities = useMemo(() => {
    if (!shouldShowMapMarkers) {
      return selectedFacility ? [selectedFacility] : [];
    }

    const visible = renderedFacilities.slice(0, MAX_MAP_FACILITIES);
    if (selectedFacility && !visible.some((facility) => facility.id === selectedFacility.id)) {
      return [selectedFacility, ...visible.slice(0, MAX_MAP_FACILITIES - 1)];
    }
    return visible;
  }, [renderedFacilities, selectedFacility, shouldShowMapMarkers]);
  const loadingLabel = useMemo(() => copy.loading.replace(/650\+\s*/g, '').trim(), [copy.loading]);
  const headerSubtitle = useMemo(() => {
    if (userPos) {
      return copy.sortedByDistance(Math.min(filtered.length, MAX_VISIBLE_FACILITIES));
    }

    if (searchTerm.trim() || selectedType !== 'All') {
      return copy.subtitle(filtered.length);
    }

    return copy.searchPlaceholder;
  }, [copy, filtered.length, searchTerm, selectedType, userPos]);

  const mapCenter: [number, number] = userPos || (selectedFacility ? [selectedFacility.lat, selectedFacility.lng] : DEFAULT_INDIA_CENTER);
  const mapZoom = userPos ? 13 : selectedFacility ? 11 : 5;

  const types = getCentersTypeOptions();
  const defaultGuidePrompt = selectedFacility ? getVoicePrompt(language, 'centersSelected') : getVoicePrompt(language, 'centers');

  useEffect(() => {
    setGuidePrompt(defaultGuidePrompt);
  }, [defaultGuidePrompt]);

  const speakGuide = (message: string) => {
    setGuidePrompt(message);
    setGuideReplayToken((value) => value + 1);
  };

  const handleSearchVoiceInput = async () => {
    if (voiceSearching) return;
    setVoiceSearching(true);

    try {
      const transcript = await captureSpeechWithBrowser(language);
      if (!transcript.trim()) return;
      setSearchTerm(transcript.trim());
      handleVoiceCommand(transcript);
    } catch {
      speakGuide(copy.locationUnsupported);
    } finally {
      setVoiceSearching(false);
    }
  };

  const handleVoiceCommand = (transcript: string) => {
    const text = normalizeSpeechText(transcript);
    if (!text) return;

    if (selectedFacility && matchesCentersCommand(text, 'book')) {
      setBookingFacility(selectedFacility);
      return;
    }

    if (selectedFacility && matchesCentersCommand(text, 'close')) {
      setSelectedFacility(null);
      return;
    }

    if (matchesCentersCommand(text, 'location')) {
      requestLocation();
      return;
    }

    if (matchesCentersCommand(text, 'bookNearest') && filtered[0]) {
      setSelectedFacility(filtered[0]);
      setBookingFacility(filtered[0]);
      return;
    }

    if (matchesCentersCommand(text, 'bookNearest')) {
      speakGuide(copy.noNearby);
      return;
    }

    if (matchesCentersCommand(text, 'showMap')) {
      setMapView(true);
      speakGuide(copy.mapOpened);
      return;
    }

    if (matchesCentersCommand(text, 'showList')) {
      setMapView(false);
      speakGuide(copy.listOpened);
      return;
    }

    if (matchesCentersCommand(text, 'clearFilters')) {
      setSearchTerm('');
      setSelectedType('All');
      setSelectedFacility(null);
      speakGuide(copy.filtersCleared);
      return;
    }

    if (matchesCentersCommand(text, 'all')) {
      setSelectedType('All');
      setSelectedFacility(null);
      setSearchTerm('');
      speakGuide(copy.filtersCleared);
      return;
    }

    const matchedType = matchCentersType(text);
    if (matchedType && matchedType !== 'All') {
      setSelectedType(matchedType);
      setSelectedFacility(null);
      speakGuide(copy.typeSelected(copy.typeLabels[matchedType]));
      return;
    }

    const exactFacility = allFacilities.find((facility) => normalizeSpeechText(facility.name).includes(text));
    if (exactFacility) {
      setSearchTerm(exactFacility.name);
      setSelectedFacility(exactFacility);
      return;
    }

    setSearchTerm(transcript.trim());
    speakGuide(copy.searching(transcript.trim()));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm text-muted-foreground">{loadingLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 pt-3 pb-2 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-display text-base font-bold">{copy.title}</h1>
            <p className="text-[10px] text-muted-foreground">{headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Map / List toggle */}
            <button
              onClick={() => setMapView(!mapView)}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${mapView ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground'}`}
            >
              {mapView ? <><List size={13} /> {copy.list}</> : <><MapIcon size={13} /> {copy.map}</>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full pl-8 pr-20 h-9 rounded-xl text-sm bg-muted border-0 outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => void handleSearchVoiceInput()}
              disabled={voiceSearching}
              className="absolute right-8 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-primary disabled:opacity-60"
              aria-label={copy.searchPlaceholder}
            >
              {voiceSearching ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
            </button>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={requestLocation}
            disabled={locationLoading}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${userPos ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
            title={copy.useMyLocation}
          >
            {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold shrink-0 transition-colors ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'}`}
          >
            <Filter size={13} /> {copy.filter}
          </button>
        </div>

        {/* Filter pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">{copy.facilityType}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {types.map(t => (
                    <button key={t} onClick={() => setSelectedType(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedType === t ? 'bg-secondary text-white border-secondary' : 'border-border text-muted-foreground'}`}
                    >{copy.typeLabels[t]}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {locationError && (
          <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1">
            <AlertCircle size={13} /> {locationError}
          </div>
        )}
      </div>

      <div className="px-3 pt-3">
        <SwasthyaSewaGuide
          prompt={guidePrompt}
          language={language}
          replayToken={guideReplayToken}
          onTranscript={handleVoiceCommand}
          autoListen={false}
          showUi={false}
        />
      </div>

      {/* Map View */}
      {mapView ? (
        <div className="flex flex-col flex-1 overflow-hidden pt-3">
          {/* MAP */}
          <div className="relative" style={{ height: '320px' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapResizeFix markerCount={mapFacilities.length} mapView={mapView} />
              <LocationFlyTo userPos={userPos} />
              <FlyToFacility facility={selectedFacility} />

              {/* User location */}
              {userPos && (
                <>
                  <Marker position={userPos} icon={createUserIcon()}>
                    <Popup><b>{copy.youAreHere}</b></Popup>
                  </Marker>
                  <Circle center={userPos} radius={1000} color="#4F46E5" fillColor="#4F46E5" fillOpacity={0.05} weight={1} />
                </>
              )}

              {/* Facility markers clustered */}
              <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                {mapFacilities.map(f => (
                  <Marker
                    key={f.id}
                    position={[f.lat, f.lng]}
                    icon={createCustomIcon(f.type, selectedFacility?.id === f.id)}
                    eventHandlers={{ click: () => setSelectedFacility(f) }}
                  >
                    <Popup>
                      <div style={{ minWidth: '180px', fontFamily: 'Roboto, sans-serif' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.name}</p>
                        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{copy.typeLabels[getFacilityDisplayType(f)]} · {getLocalizedCityLabel(f.city, copy)}</p>
                        <p style={{ fontSize: 11, color: '#475569' }}>{f.address}</p>
                        {f.distance && <p style={{ fontSize: 11, color: '#4F46E5', fontWeight: 600, marginTop: 4 }}>{formatDistance(f.distance)} {copy.away}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute bottom-2 left-2 z-[500] bg-white/90 backdrop-blur rounded-lg px-2 py-1.5 shadow border border-border/50">
              <div className="flex flex-col gap-0.5">
                {[
                  { type: 'phc', label: 'PHC' }, { type: 'uphc', label: 'UPHC' },
                  { type: 'chc', label: 'CHC' }, { type: 'major_hospital', label: 'Hospital' },
                ].map(({ type, label }) => {
                  const { dot } = getTypeConfig(type);
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ background: dot }} />
                      <span className="text-[10px] font-medium text-muted-foreground">{copy.typeLabels[label as CentersType]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Facilities count badge */}
            {shouldShowMapMarkers && (
              <div className="absolute top-2 right-2 z-[500] bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
                {copy.shown(mapFacilities.length)}
              </div>
            )}
          </div>

          {/* Selected facility panel */}
          <AnimatePresence>
            {selectedFacility && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-3 py-3 shadow-lg z-10"
              >
                <FacilityCard facility={selectedFacility} onClose={() => setSelectedFacility(null)} compact onBook={f => setBookingFacility(f)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Facility list below map */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {userPos ? copy.nearestFacilities : copy.allFacilities}
            </p>
            {renderedFacilities.slice(0, MAX_LIST_FACILITIES).map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <FacilityCard facility={f} onSelect={() => setSelectedFacility(f)} selected={selectedFacility?.id === f.id} onBook={f => setBookingFacility(f)} />
              </motion.div>
            ))}
            {renderedFacilities.length > MAX_LIST_FACILITIES && (
              <p className="text-center text-xs text-muted-foreground py-2">
                {copy.showingOf(Math.min(MAX_LIST_FACILITIES, renderedFacilities.length), filtered.length)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5 pt-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {userPos ? copy.sortedByDistance(renderedFacilities.length) : copy.subtitle(filtered.length)}
          </p>
          {renderedFacilities.slice(0, MAX_LIST_FACILITIES).map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
              <FacilityCard facility={f} onBook={f => setBookingFacility(f)} />
            </motion.div>
          ))}
          {renderedFacilities.length > MAX_LIST_FACILITIES && (
            <p className="text-center text-xs text-muted-foreground py-2">
              {copy.showingOf(Math.min(MAX_LIST_FACILITIES, renderedFacilities.length), filtered.length)}
            </p>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {bookingFacility && (
        <BookingModal
          facility={bookingFacility}
          onClose={() => setBookingFacility(null)}
        />
      )}
    </div>
  );
}

function FacilityCard({
  facility: f, onClose, compact, onSelect, selected, onBook
}: {
  facility: Facility;
  onClose?: () => void;
  compact?: boolean;
  onSelect?: () => void;
  selected?: boolean;
  onBook?: (f: Facility) => void;
}) {
  const language = useAppStore((state) => state.language);
  const { t } = useTranslation();
  const copy = useMemo(() => getCentersCopy(language), [language]);
  const cfg = getTypeConfig(f.type);
  const displayType = getFacilityDisplayType(f);

  return (
    <div
      onClick={onSelect}
      className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-all shadow-sm ${
        selected ? 'border-primary shadow-primary/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary/30'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
            <Building2 size={16} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{f.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    {copy.typeLabels[displayType]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{getLocalizedCityLabel(f.city, copy)}</span>
                  {f.distance !== undefined && (
                    <span className="text-[10px] font-semibold text-primary">{formatDistance(f.distance)} {copy.away}</span>
                  )}
                </div>
              </div>
              {onClose && (
                <button onClick={onClose} className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                  <X size={12} className="text-muted-foreground" />
                </button>
              )}
            </div>
            {!compact && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{f.address}</p>
            )}
          </div>
        </div>

        {!compact && (
          <>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock size={11} className="text-primary" /> {f.openHours}</span>
              <span className={`flex items-center gap-1 font-semibold ${f.isFree ? 'text-green-700' : 'text-orange-700'}`}>
                <IndianRupee size={11} /> {f.isFree ? copy.free : copy.paid}
              </span>
            </div>

            {f.vaccinesAvailable?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {f.vaccinesAvailable.slice(0, 4).map((v, i) => (
                  <span key={i} className="text-[10px] bg-primary/8 text-primary px-1.5 py-0.5 rounded-full border border-primary/15">{v}</span>
                ))}
                {f.vaccinesAvailable.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{f.vaccinesAvailable.length - 4}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(f.name + ' ' + f.address)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold border border-primary text-primary rounded-full py-1.5 hover:bg-primary/5 transition-colors"
              >
                <Navigation size={12} /> {t('navigate')}
              </a>
              <button
                onClick={e => { e.stopPropagation(); onBook?.(f); }}
                className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold bg-primary text-white rounded-full py-1.5 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <CalendarPlus size={12} /> {t('bookAppointment')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

