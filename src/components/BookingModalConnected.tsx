import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  MessageSquare,
  Syringe,
  MapPin,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useGetVaccineSchedule, useListChildren } from '@workspace/api-client-react';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { useAppStore } from '@/store';
import { getVoicePrompt } from '@/lib/voicePrompts';
import {
  BOOKING_RESCHEDULE_SOURCE_KEY,
  type LiveBooking,
  useCreateLiveBooking,
  useRescheduleLiveBooking,
} from '@/lib/bookingApi';
import {
  downloadAppointmentSlip,
  downloadCancellationSlip,
  downloadRescheduleSlip,
} from '@/lib/appointmentPdf';
import {
  generateDaySlots,
  generateSessionSites,
  type DaySlot,
  type SessionSite,
} from '@/lib/bookingSlots';

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
}

function extractPincode(address: string): string {
  const match = address.match(/\d{6}/);
  return match ? match[0] : '400001';
}

export default function BookingModalConnected({
  facility,
  onClose,
  initialSelection,
}: {
  facility: Facility;
  onClose: () => void;
  initialSelection?: {
    siteId?: string;
    dateIso?: string;
  };
}) {
  const [step, setStep] = useState<'slots' | 'confirm' | 'sms'>('slots');
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSite, setSelectedSite] = useState<SessionSite | null>(null);
  const [booking, setBooking] = useState<LiveBooking | null>(null);
  const [error, setError] = useState('');

  const activeChildId = useAppStore((state) => state.activeChildId);
  const language = useAppStore((state) => state.language);
  const { data: children } = useListChildren();
  const child = children?.find((row) => row.id === activeChildId) || children?.[0];
  const { data: schedule } = useGetVaccineSchedule(activeChildId || child?.id || '', {
    query: { enabled: !!(activeChildId || child?.id) },
  });

  const createMutation = useCreateLiveBooking();
  const rescheduleMutation = useRescheduleLiveBooking();

  const today = new Date();
  const sessionSites = useMemo(() => generateSessionSites(facility), [facility]);
  const slotsPerSite = useMemo(
    () => Object.fromEntries(sessionSites.map((site) => [site.id, generateDaySlots(facility.id, site.id)])),
    [facility, sessionSites],
  );
  const visibleDates = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const value = new Date(today);
        value.setDate(today.getDate() + dateOffset + index);
        return value;
      }),
    [dateOffset, today],
  );

  const recommendedVaccine = useMemo(() => {
    if (!schedule) return null;
    return [
      ...schedule.missed,
      ...schedule.dueToday,
      ...schedule.dueThisWeek,
      ...schedule.upcoming,
    ][0] || null;
  }, [schedule]);

  const pincode = extractPincode(facility.address);
  const isPending = createMutation.isPending || rescheduleMutation.isPending;

  useEffect(() => {
    if (!initialSelection) return;

    if (initialSelection.siteId) {
      const preselectedSite = sessionSites.find((site) => site.id === initialSelection.siteId);
      if (preselectedSite) {
        setSelectedSite(preselectedSite);
      }
    }

    if (initialSelection.dateIso) {
      const nextDate = new Date(initialSelection.dateIso);
      if (!Number.isNaN(nextDate.getTime())) {
        setSelectedDate(nextDate);
        const dayDiff = Math.max(
          0,
          Math.floor((nextDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000),
        );
        setDateOffset(Math.max(0, Math.min(3, dayDiff)));
      }
    }
  }, [initialSelection, sessionSites]);

  const formatDate = (value: Date) =>
    value.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const formatDisplay = (value: Date) =>
    value.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const pickFirstAvailable = (options?: { siteHint?: number; dayOffset?: number }) => {
    const orderedSites = options?.siteHint != null ? [sessionSites[options.siteHint]].filter(Boolean) : sessionSites;
    const orderedDates = options?.dayOffset != null ? visibleDates.filter((_, index) => index === options.dayOffset) : visibleDates;

    for (const site of orderedSites) {
      const siteSlots = slotsPerSite[site.id];
      for (const date of orderedDates) {
        const slot = siteSlots[date.toDateString()];
        if (slot?.available) {
          setSelectedSite(site);
          setSelectedDate(date);
          return true;
        }
      }
    }

    return false;
  };

  const slotPrompt =
    selectedDate && selectedSite
      ? `${selectedSite.siteName}. ${formatDisplay(selectedDate)} selected. ${getVoicePrompt(language, 'bookingSlot')}`
      : getVoicePrompt(language, 'bookingSlot');

  const handleBook = async () => {
    if (!selectedDate || !selectedSite) return;
    if (!child) {
      setError('Please select or add a child profile before booking.');
      return;
    }

    const siteSlots = slotsPerSite[selectedSite.id];
    const slot = siteSlots[selectedDate.toDateString()];
    if (!slot?.available) return;

    if (!recommendedVaccine) {
      setError('No vaccine is available to book for this child yet.');
      return;
    }

    setError('');

    try {
      const rescheduleSourceId = window.sessionStorage.getItem(BOOKING_RESCHEDULE_SOURCE_KEY);
      const payload = {
        childId: child.id,
        vaccineId: recommendedVaccine.vaccineId,
        vaccineName: recommendedVaccine.name,
        centerId: facility.id,
        centerName: facility.name,
        centerAddress: facility.address,
        centerCity: facility.city,
        sessionSite: selectedSite.siteName,
        date: selectedDate.toISOString(),
        time: slot.time,
      };

      const nextBooking = rescheduleSourceId
        ? await rescheduleMutation.mutateAsync({
            id: rescheduleSourceId,
            data: {
              newDate: payload.date,
              newTime: payload.time,
              newCenterId: payload.centerId,
              newCenterName: payload.centerName,
              newCenterAddress: payload.centerAddress,
              newCenterCity: payload.centerCity,
              newSessionSite: payload.sessionSite,
              remarks: 'Rescheduled from the parent app.',
            },
          })
        : await createMutation.mutateAsync(payload);

      if (rescheduleSourceId) {
        window.sessionStorage.removeItem(BOOKING_RESCHEDULE_SOURCE_KEY);
      }

      setBooking(nextBooking);
      setStep('confirm');
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to save this appointment right now.');
    }
  };

  const handleSlotVoiceCommand = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    if (!text) return;

    if (/(next|next dates|next days|more dates)/.test(text)) {
      setDateOffset((value) => Math.min(3, value + 1));
      return;
    }

    if (/(previous|back dates|earlier dates|previous days)/.test(text)) {
      setDateOffset((value) => Math.max(0, value - 1));
      return;
    }

    if (/(confirm|book now|continue|proceed)/.test(text) && selectedDate && selectedSite) {
      void handleBook();
      return;
    }

    if (/(today)/.test(text)) {
      pickFirstAvailable({ dayOffset: 0 });
      return;
    }

    if (/(tomorrow)/.test(text)) {
      pickFirstAvailable({ dayOffset: 1 });
      return;
    }

    if (/(site 1|first site)/.test(text)) {
      pickFirstAvailable({ siteHint: 0 });
      return;
    }

    if (/(site 2|second site)/.test(text)) {
      pickFirstAvailable({ siteHint: 1 });
      return;
    }

    if (/(site 3|third site)/.test(text)) {
      pickFirstAvailable({ siteHint: 2 });
      return;
    }

    if (/(first available|earliest|any slot|next slot)/.test(text)) {
      pickFirstAvailable();
    }
  };

  const handleConfirmVoiceCommand = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    if (!text || !booking) return;

    if (/(download|pdf|slip)/.test(text)) {
      downloadAppointmentSlip(booking);
      return;
    }

    if (/(sms|message)/.test(text)) {
      setStep('sms');
      return;
    }

    if (/(done|close|finish)/.test(text)) {
      onClose();
      return;
    }

    if (/(back|change slot|edit)/.test(text)) {
      setStep('slots');
    }
  };

  const handleSmsVoiceCommand = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    if (!text || !booking) return;

    if (/(download|pdf|slip)/.test(text)) {
      if (booking.status === 'rescheduled') {
        downloadRescheduleSlip(booking);
        return;
      }
      if (booking.status === 'cancelled') {
        downloadCancellationSlip(booking);
        return;
      }
      downloadAppointmentSlip(booking);
      return;
    }

    if (/(done|close|finish)/.test(text)) {
      onClose();
      return;
    }

    if (/(back|confirmation)/.test(text)) {
      setStep('confirm');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/60 flex flex-col justify-end"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '94vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        {step === 'slots' && (
          <>
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
                <ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Book Appointment for Routine Vaccination</h2>
                <p className="text-[11px] text-gray-500">
                  {facility.city} · {pincode}
                  {recommendedVaccine ? ` · ${recommendedVaccine.name}` : ''}
                </p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="px-4 pt-3">
                <SwasthyaSewaGuide prompt={slotPrompt} language={language} onTranscript={handleSlotVoiceCommand} autoListen showUi={false} />
              </div>

              <div className="px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex gap-3">
                  <button className="text-xs font-medium text-gray-400 py-1.5 px-2 border-b-2 border-transparent">Search By District/Sub District</button>
                  <button className="text-xs font-bold text-blue-600 py-1.5 px-2 border-b-2 border-blue-600">Search By Pincode</button>
                </div>
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 h-9 flex items-center text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 font-mono">
                    {pincode}
                  </div>
                  <button className="h-9 px-4 bg-blue-600 text-white text-xs font-bold rounded-lg">Search</button>
                </div>
              </div>

              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Slot Search Results</h3>
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                  <span className="text-yellow-700 text-[10px] font-bold mt-0.5 shrink-0">IMPORTANT</span>
                  <p className="text-[10px] text-yellow-800">
                    Search is limited to session sites tagged with pincode and only bookable session sites are shown.
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setDateOffset(Math.max(0, dateOffset - 1))} disabled={dateOffset === 0} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 shrink-0">
                    <ChevronLeft size={13} />
                  </button>
                  <div className="flex-1 grid grid-cols-5 gap-1">
                    {visibleDates.map((date, index) => {
                      const isToday = date.toDateString() === today.toDateString();
                      return (
                        <div key={index} className="text-center">
                          <p className={`text-[10px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                            {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </p>
                          <p className={`text-[10px] ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                            {date.getDate()} {date.toLocaleDateString('en-IN', { month: 'short' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setDateOffset(Math.min(3, dateOffset + 1))} disabled={dateOffset >= 3} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 shrink-0">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {sessionSites.map((site) => {
                  const siteSlots = slotsPerSite[site.id];
                  return (
                    <div key={site.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex-1 line-clamp-1">{site.siteName}</p>
                          <span className="text-[9px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded shrink-0">{site.siteCode}</span>
                        </div>
                        <div className="flex items-start gap-1 mt-0.5">
                          <MapPin size={9} className="text-gray-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-gray-500 line-clamp-1">{site.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 divide-x divide-gray-100 dark:divide-gray-700">
                        {visibleDates.map((date, index) => {
                          const slot = siteSlots[date.toDateString()];
                          const isSelected = selectedSite?.id === site.id && selectedDate?.toDateString() === date.toDateString();
                          const isFull = !slot?.available;
                          return (
                            <button
                              key={index}
                              disabled={isFull}
                              onClick={() => {
                                setSelectedDate(date);
                                setSelectedSite(site);
                              }}
                              className={`flex flex-col items-center px-1 py-2.5 text-center transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : isFull
                                    ? 'bg-gray-50 dark:bg-gray-800 cursor-default'
                                    : 'bg-green-50 dark:bg-green-950 hover:bg-green-100 cursor-pointer'
                              }`}
                            >
                              {isFull ? (
                                <p className="text-[10px] font-bold text-gray-400">NA</p>
                              ) : (
                                <>
                                  <p className={`text-[9px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-green-800 dark:text-green-300'}`}>
                                    UIP Vaccination
                                  </p>
                                  <p className={`text-[8px] mt-0.5 leading-tight ${isSelected ? 'text-white/80' : 'text-green-700 dark:text-green-400'}`}>
                                    {slot.time.split('-')[0].trim()}
                                  </p>
                                  <p className={`text-[8px] ${isSelected ? 'text-white/80' : 'text-green-700 dark:text-green-400'}`}>
                                    - {slot.time.split('-')[1]?.trim()}
                                  </p>
                                  <div className={`mt-1 text-[8px] font-semibold ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                                    {slot.capacity - slot.booked} left
                                  </div>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
              {selectedDate && selectedSite ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
                    <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{selectedSite.siteName.replace('SESSION SITE : ', '')}</p>
                      <p className="text-[11px] text-gray-500">{formatDisplay(selectedDate)}</p>
                    </div>
                  </div>
                  <button onClick={() => void handleBook()} disabled={isPending} className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md disabled:opacity-60">
                    {isPending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin" /> Saving appointment
                      </span>
                    ) : (
                      'Confirm Appointment'
                    )}
                  </button>
                </div>
              ) : (
                <button disabled className="w-full h-11 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed">
                  Select a Session Slot to Continue
                </button>
              )}
            </div>
          </>
        )}

        {step === 'confirm' && booking && (
          <>
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => setStep('slots')} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold dark:text-white">
                {booking.status === 'rescheduled' ? 'Appointment Rescheduled' : 'Appointment Confirmed'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
              <SwasthyaSewaGuide
                prompt={getVoicePrompt(language, 'bookingConfirm')}
                language={language}
                onTranscript={handleConfirmVoiceCommand}
                autoListen
                showUi={false}
              />

              <div className="bg-green-600 rounded-2xl py-4 px-4 flex items-center justify-center gap-2.5">
                <CheckCircle2 size={20} className="text-white" />
                <div>
                  <p className="text-white font-bold text-sm">
                    {booking.status === 'rescheduled' ? 'Appointment Rescheduled!' : 'Appointment Confirmed!'}
                  </p>
                  <p className="text-white/75 text-xs">Ref ID: {booking.referenceId.slice(-8)}</p>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Syringe size={14} className="text-blue-600" />
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Appointment Details</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: 'Beneficiary', value: booking.childName },
                    { label: 'Reference ID', value: booking.referenceId },
                    { label: 'Vaccine', value: booking.vaccineName },
                    { label: 'Session Site', value: booking.centerName },
                    { label: 'Address', value: booking.centerAddress || '-' },
                    { label: 'Date', value: formatDate(new Date(booking.date)) },
                    { label: 'Time', value: booking.time },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-3 px-3 py-2">
                      <p className="text-xs text-gray-500 shrink-0 w-28">{label}</p>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white flex-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 border-2 border-amber-300 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-amber-700">{booking.secretCode}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Your 4-digit Secret Code</p>
                  <p className="text-[10px] text-amber-700">Show this to the health worker at the centre</p>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={() => downloadAppointmentSlip(booking)} className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                  <Download size={16} /> Download Appointment Slip (PDF)
                </button>
                <button onClick={() => setStep('sms')} className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm flex items-center justify-center gap-2">
                  <MessageSquare size={16} /> View SMS Confirmation
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button onClick={onClose} className="w-full h-11 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm">
                Done
              </button>
            </div>
          </>
        )}

        {step === 'sms' && booking && (
          <>
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => setStep('confirm')} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold dark:text-white">SMS Confirmation</h2>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-[#ECE5DD]">
              <SwasthyaSewaGuide
                prompt={getVoicePrompt(language, 'bookingSms')}
                language={language}
                onTranscript={handleSmsVoiceCommand}
                autoListen
                className="bg-white/90"
                showUi={false}
              />

              <p className="text-center text-xs text-gray-500 bg-white/60 rounded-full px-3 py-1 w-fit mx-auto">
                {new Date(booking.bookedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex justify-start">
                <div className="max-w-[88%] bg-white rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-sm">
                  <p className="text-[13px] text-gray-800 leading-relaxed">
                    Dear {booking.childName}, vaccination is scheduled on{' '}
                    <span className="font-semibold underline">{formatDate(new Date(booking.date))}</span> between{' '}
                    <span className="underline">{booking.time}</span> at{' '}
                    <span className="font-semibold">{booking.centerName}</span>. Your booking reference ID is{' '}
                    <span className="underline">{booking.referenceId}</span> and your 4-digit secret code is{' '}
                    <span className="underline font-bold">{booking.secretCode}</span>. - Raksha Setu
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-white dark:bg-gray-900 shrink-0 space-y-2">
              <button onClick={() => downloadAppointmentSlip(booking)} className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                <Download size={15} /> Download PDF Slip
              </button>
              <button onClick={onClose} className="w-full h-10 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm">
                Done
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
