import React, { useState, useEffect } from 'react';
import { Phone, AlertTriangle, ShieldAlert, HeartPulse, MapPin, ChevronRight, Navigation, Loader2, X, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

interface NearbyFacility {
  name: string; address: string; type: string; distance: number; lat: number; lng: number;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function GuideSheet({ title, steps, onClose, callLabel }: { title: string; steps: string[]; onClose: () => void; callLabel: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <span className="text-xs font-bold text-white">{i + 1}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-0.5">{step}</p>
            </div>
          ))}
        </div>
        <div className="px-5 pb-8 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <a href="tel:108"
            className="w-full h-13 bg-red-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-red-950 py-3.5">
            <Phone size={16} /> {callLabel}
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

const EmergencyIllus = () => (
  <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <radialGradient id="eface" cx="38%" cy="32%" r="62%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="60%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#D97706"/></radialGradient>
      <radialGradient id="ebody" cx="50%" cy="28%" r="65%"><stop offset="0%" stopColor="#F9FAFB"/><stop offset="100%" stopColor="#E5E7EB"/></radialGradient>
      <filter id="esh"><feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="rgba(0,0,0,0.2)"/></filter>
    </defs>
    <rect x="30" y="32" width="38" height="22" rx="5" fill="white" filter="url(#esh)"/>
    <rect x="30" y="32" width="38" height="10" rx="5" fill="#DC2626"/>
    <rect x="30" y="38" width="38" height="4" fill="#DC2626"/>
    <rect x="36" y="45" width="6" height="6" rx="1.5" fill="#BFDBFE"/>
    <rect x="46" y="45" width="6" height="6" rx="1.5" fill="#BFDBFE"/>
    <circle cx="37" cy="56" r="4" fill="#374151"/><circle cx="37" cy="56" r="2.5" fill="#9CA3AF"/>
    <circle cx="61" cy="56" r="4" fill="#374151"/><circle cx="61" cy="56" r="2.5" fill="#9CA3AF"/>
    <rect x="48" y="34" width="6" height="2" rx="1" fill="white"/><rect x="50" y="32.5" width="2" height="5" rx="1" fill="white"/>
    <circle cx="60" cy="32" r="3.5" fill="#EF4444" filter="url(#esh)"/>
    <circle cx="60" cy="32" r="6" fill="none" stroke="#FCA5A5" strokeWidth="1.5" opacity="0.5"/>
    <ellipse cx="22" cy="62" rx="14" ry="8" fill="url(#ebody)" filter="url(#esh)"/>
    <ellipse cx="22" cy="58" rx="12" ry="6.5" fill="url(#ebody)"/>
    <ellipse cx="14" cy="50" rx="3.5" ry="8" fill="#F59E0B" transform="rotate(25 14 50)"/>
    <ellipse cx="32" cy="50" rx="3.5" ry="8" fill="#F59E0B" transform="rotate(-25 32 50)"/>
    <rect x="18" y="44" width="8" height="6" rx="3" fill="#F59E0B"/>
    <path d="M17 53 Q11 60 16 64" stroke="#6B7280" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    <circle cx="16" cy="64" r="3" fill="#7C3AED"/>
    <ellipse cx="22" cy="36" rx="13" ry="13" fill="url(#eface)" filter="url(#esh)"/>
    <ellipse cx="17" cy="30" rx="5.5" ry="3.5" fill="rgba(255,255,255,0.26)" transform="rotate(-20 17 30)"/>
    <ellipse cx="22" cy="26" rx="13" ry="6.5" fill="#92400E"/>
    <ellipse cx="10" cy="36" rx="3.5" ry="7" fill="#92400E"/>
    <ellipse cx="34" cy="36" rx="3.5" ry="7" fill="#92400E"/>
    <rect x="12" y="26" width="20" height="4" rx="2" fill="#7C3AED"/>
    <circle cx="22" cy="27" r="2.5" fill="#A78BFA"/>
    <ellipse cx="17" cy="37" rx="2.8" ry="3" fill="white"/><ellipse cx="27" cy="37" rx="2.8" ry="3" fill="white"/>
    <circle cx="17.5" cy="37.5" r="1.8" fill="#1F2937"/><circle cx="27.5" cy="37.5" r="1.8" fill="#1F2937"/>
    <circle cx="18.5" cy="36.5" r="0.7" fill="white"/><circle cx="28.5" cy="36.5" r="0.7" fill="white"/>
    <ellipse cx="12" cy="40" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <ellipse cx="32" cy="40" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <path d="M17 43 Q22 47 27 43" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
  </svg>
);

export default function Emergency() {
  const { t } = useTranslation();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyFacility, setNearbyFacility] = useState<NearbyFacility | null>(null);
  const [openGuide, setOpenGuide] = useState<'bite' | 'injury' | 'fever' | null>(null);

  const GUIDES = {
    bite: {
      title: `🐕 ${t('dogAnimalBite')}`,
      steps: [
        t('biteStep1') || 'Wash the wound immediately with soap and water for at least 15 minutes under running water.',
        t('biteStep2') || 'Apply an antiseptic like povidone-iodine or alcohol to the wound.',
        t('biteStep3') || 'Do NOT bandage the wound tightly — let it breathe.',
        t('biteStep4') || 'Go to the nearest PHC or hospital IMMEDIATELY for anti-rabies vaccination.',
        t('biteStep5') || 'Complete all doses of the anti-rabies vaccine (Day 0, 3, 7, 14, 28) — never skip.',
        t('biteStep6') || 'Call 108 if the bleeding is severe or the animal is wild / unknown.',
      ],
    },
    injury: {
      title: `🩹 ${t('injuryWound')}`,
      steps: [
        t('injStep1') || 'Apply firm pressure with a clean cloth to stop bleeding. Hold for 10–15 minutes.',
        t('injStep2') || 'If the wound is deep or gaping, do NOT try to close it yourself.',
        t('injStep3') || 'Elevate the injured limb above heart level to reduce bleeding.',
        t('injStep4') || 'Check your tetanus vaccination status — get a TT shot if due.',
        t('injStep5') || 'Clean the wound with saline solution or clean water.',
        t('injStep6') || 'Go to the nearest PHC / hospital immediately for tetanus shot and wound care.',
        t('injStep7') || 'Call 108 if there is heavy bleeding, bone exposure, or loss of consciousness.',
      ],
    },
    fever: {
      title: `🌡️ ${t('highFeverChild')}`,
      steps: [
        t('fevStep1') || 'Check temperature: Fever is ≥ 38°C (100.4°F). Use a digital thermometer.',
        t('fevStep2') || 'Give age-appropriate paracetamol (Crocin/Calpol) as per weight-based dose.',
        t('fevStep3') || 'Keep the child hydrated — ORS, coconut water, or plain water.',
        t('fevStep4') || 'Sponge the child with lukewarm (not cold) water on forehead and armpits.',
        t('fevStep5') || 'Remove extra clothes — dress in a single layer of cotton.',
        t('fevStep6') || 'If fever > 39.5°C, febrile seizures, rash, stiff neck — call 108 immediately.',
        t('fevStep7') || 'Do NOT give aspirin to children under 16.',
      ],
    },
  };

  const getLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t('enableLocationMsg'));
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        setLocationLoading(false);
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}health-facilities.json`);
          const data: NearbyFacility[] = await res.json();
          const withDist = data.map(f => ({ ...f, distance: haversine(latitude, longitude, f.lat, f.lng) }))
            .sort((a, b) => a.distance - b.distance);
          if (withDist.length > 0) setNearbyFacility(withDist[0]);
        } catch {}
      },
      () => {
        setLocationError(t('enableLocationMsg'));
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { getLocation(); }, []);

  const guide = openGuide ? GUIDES[openGuide] : null;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 min-h-full">

      {/* Header band */}
      <div className="bg-red-600 px-4 pt-5 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-xl leading-tight tracking-tight">{t('emergencyHelp')}</h1>
            <p className="text-white/75 text-xs font-medium mt-0.5">{t('freeGovServices')}</p>
          </div>
          <div className="w-16 h-16 shrink-0 -mt-2"><EmergencyIllus /></div>
        </div>

        <motion.a href="tel:108" whileTap={{ scale: 0.97 }}
          className="flex items-center gap-4 p-4 bg-white/15 border border-white/25 rounded-2xl backdrop-blur-sm">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
            <Phone size={26} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-0.5">{t('freeAmbulance')}</p>
            <h2 className="text-white font-bold text-2xl leading-none">{t('dial108')}</h2>
            <p className="text-white/65 text-xs mt-1">{t('ashaTollFree')}</p>
          </div>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <ChevronRight size={20} className="text-white" />
          </div>
        </motion.a>
      </div>

      <div className="p-4 space-y-3">

        {/* Secondary helplines */}
        <div className="grid grid-cols-2 gap-2.5">
          <motion.a href="tel:100" whileTap={{ scale: 0.97 }}
            className="flex flex-col gap-2 p-3.5 bg-blue-600 rounded-2xl shadow-md shadow-blue-200 dark:shadow-blue-950">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{t('police100')}</p>
              <p className="text-white/70 text-xs mt-0.5">{t('controlRoom24x7')}</p>
            </div>
          </motion.a>

          <motion.a href="tel:104" whileTap={{ scale: 0.97 }}
            className="flex flex-col gap-2 p-3.5 bg-indigo-600 rounded-2xl shadow-md shadow-indigo-200 dark:shadow-indigo-950">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <HeartPulse size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{t('health104')}</p>
              <p className="text-white/70 text-xs mt-0.5">{t('nhmHelpline')}</p>
            </div>
          </motion.a>
        </div>

        {/* First Aid Guides */}
        <div>
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 px-0.5">{t('firstAidGuides')}</p>
          <div className="space-y-2">
            {[
              { key: 'bite' as const, icon: '🐕', title: t('dogAnimalBite'), sub: t('animalBiteSub'), bg: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
              { key: 'injury' as const, icon: '🩹', title: t('injuryWound'), sub: t('injurySub'), bg: 'bg-violet-500', lightBg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800' },
              { key: 'fever' as const, icon: '🌡️', title: t('highFeverChild'), sub: t('feverSub'), bg: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
            ].map(({ key, icon, title, sub, bg, lightBg, border }) => (
              <button key={key} onClick={() => setOpenGuide(key)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border ${lightBg} ${border} text-left active:scale-[0.99] transition-transform`}>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-lg leading-none">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{sub}</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shrink-0">
                  <ChevronRight size={14} className="text-gray-400 dark:text-gray-500" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Nearest Centre */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <MapPin size={13} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">{t('nearestHealthCentre')}</p>
          </div>
          <div className="p-4">
            {locationLoading ? (
              <div className="flex items-center gap-2.5 py-2">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('detectingLocation')}</span>
              </div>
            ) : locationError ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{locationError}</p>
                </div>
                <button onClick={getLocation}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
                  <RefreshCw size={11} /> {t('tryAgain')}
                </button>
              </div>
            ) : nearbyFacility ? (
              <div className="space-y-3">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{nearbyFacility.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{nearbyFacility.address}</p>
                  <span className="inline-block mt-1.5 text-[11px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                    {nearbyFacility.distance.toFixed(1)} {t('kmAwayFree')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(nearbyFacility.name + ' ' + nearbyFacility.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl py-2.5">
                    <Navigation size={13} /> {t('navigate')}
                  </a>
                  <a href="tel:108"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-red-600 rounded-xl py-2.5 shadow-sm">
                    <Phone size={13} /> {t('call108')}
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{t('nearestCenter')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('enableLocationMsg')}</p>
                </div>
                <button onClick={getLocation}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 rounded-xl px-4 py-2.5 shadow-sm">
                  <MapPin size={12} /> {t('findNearestCentre')}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed px-3 pb-4">
          {t('emergencyDisclaimer')}
        </p>
      </div>

      <AnimatePresence>
        {guide && (
          <GuideSheet title={guide.title} steps={guide.steps} onClose={() => setOpenGuide(null)} callLabel={t('callAmbulanceNow')} />
        )}
      </AnimatePresence>
    </div>
  );
}
