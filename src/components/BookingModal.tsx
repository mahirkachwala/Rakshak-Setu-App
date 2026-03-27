import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X, ChevronLeft, ChevronRight, CheckCircle2, Download, MessageSquare, Syringe, MapPin, Clock, Phone } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useListChildren } from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoicePrompt } from '@/lib/voicePrompts';

export const BOOKING_STORAGE_KEY = 'swasthya-setu-bookings';

export interface SavedBooking {
  id: string;
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  sessionSite: string;
  date: string;
  time: string;
  refId: string;
  childName: string;
  secretCode: string;
  bookedAt: string;
  status?: 'upcoming' | 'cancelled';
  cancelledAt?: string;
}

export function getSavedBookings(): SavedBooking[] {
  try {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBooking(b: SavedBooking) {
  try {
    const existing = getSavedBookings();
    const updated = [b, ...existing.slice(0, 9)];
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function cancelBooking(id: string) {
  try {
    const existing = getSavedBookings();
    const updated = existing.map(b =>
      b.id === id ? { ...b, status: 'cancelled' as const, cancelledAt: new Date().toISOString() } : b
    );
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

interface Facility {
  id: string; name: string; type: string; facilityType: string;
  city: string; address: string; lat: number; lng: number;
  isFree: boolean; openHours: string; vaccinesAvailable: string[];
}

// Multiple session sites per facility (like U-WIN)
interface SessionSite {
  id: string;
  siteName: string;
  siteCode: string;
  address: string;
}

interface DaySlot {
  date: Date;
  available: boolean;
  time: string;
  capacity: number;
  booked: number;
}

function generateSessionSites(facility: Facility): SessionSite[] {
  return [
    { id: 's1', siteName: `SESSION SITE : HRA ${facility.name.slice(0, 25).toUpperCase()}`, siteCode: 'GOVT', address: facility.address },
    { id: 's2', siteName: `SESSION SITE : ${facility.facilityType.toUpperCase()} – WING A`, siteCode: 'GOVT', address: `${facility.address} – Wing A` },
    { id: 's3', siteName: `SESSION SITE : MOBILE OUTREACH – ${facility.city.toUpperCase()}`, siteCode: 'GOVT', address: `Outreach Camp, ${facility.city}` },
  ];
}

function generateDaySlots(facilityId: string, siteId: string): Record<string, DaySlot> {
  const slots: Record<string, DaySlot> = {};
  const today = new Date();
  // Pseudo-random but stable per facility+site+day
  const hash = (facilityId + siteId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const TIMES = ['09:00 AM – 01:00 PM', '09:00 AM – 03:00 PM', '10:00 AM – 02:00 PM', '02:00 PM – 05:00 PM'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = d.toDateString();
    const pseudoRnd = (hash + i * 37) % 10;
    const available = pseudoRnd < 7; // 70% chance available
    const capacity = 20 + ((hash + i) % 11); // 20-30 capacity
    const booked = available ? Math.floor(capacity * (pseudoRnd / 10)) : capacity;
    slots[key] = {
      date: d,
      available: available && booked < capacity,
      time: TIMES[(hash + i) % TIMES.length],
      capacity,
      booked,
    };
  }
  return slots;
}

function generateRefId(): string {
  return String(Math.floor(10000000000000 + Math.random() * 89999999999999));
}

function extractPincode(address: string): string {
  const match = address.match(/\d{6}/);
  return match ? match[0] : '400001';
}

export default function BookingModal({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const [step, setStep] = useState<'slots' | 'confirm' | 'sms'>('slots');
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSite, setSelectedSite] = useState<SessionSite | null>(null);
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const activeChildId = useAppStore(s => s.activeChildId);
  const language = useAppStore(s => s.language);
  const { data: children } = useListChildren();
  const child = children?.find(c => c.id === activeChildId) || children?.[0];

  const today = new Date();
  const sessionSites = useMemo(() => generateSessionSites(facility), [facility]);
  const slotsPerSite = useMemo(() =>
    Object.fromEntries(sessionSites.map(s => [s.id, generateDaySlots(facility.id, s.id)])),
    [facility, sessionSites]
  );

  // 5 visible dates from offset
  const visibleDates = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + dateOffset + i); return d;
  }), [dateOffset]);

  const pincode = extractPincode(facility.address);

  const handleBook = () => {
    if (!selectedDate || !selectedSite) return;
    const siteSlots = slotsPerSite[selectedSite.id];
    const slot = siteSlots[selectedDate.toDateString()];
    if (!slot?.available) return;

    const refId = generateRefId();
    const secretCode = refId.slice(-4);
    const saved: SavedBooking = {
      id: `bk_${Date.now()}`,
      facilityName: facility.name,
      facilityAddress: facility.address,
      facilityCity: facility.city,
      sessionSite: selectedSite.siteName,
      date: selectedDate.toISOString(),
      time: slot.time,
      refId,
      childName: child?.name || 'Child',
      secretCode,
      bookedAt: new Date().toISOString(),
    };
    saveBooking(saved);
    setBooking(saved);
    setStep('confirm');
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const formatDisplay = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const pickFirstAvailable = (options?: { siteHint?: number; dayOffset?: number }) => {
    const orderedSites = options?.siteHint != null
      ? [sessionSites[options.siteHint]].filter(Boolean)
      : sessionSites;
    const orderedDates = options?.dayOffset != null
      ? visibleDates.filter((_, index) => index === options.dayOffset)
      : visibleDates;

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

  const slotPrompt = selectedDate && selectedSite
    ? `${selectedSite.siteName}. ${formatDisplay(selectedDate)} selected. ${getVoicePrompt(language, 'bookingSlot')}`
    : getVoicePrompt(language, 'bookingSlot');

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
      handleBook();
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
    if (!text) return;

    if (/(download|pdf|slip)/.test(text)) {
      handleDownloadPDF();
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
    if (!text) return;

    if (/(download|pdf|slip)/.test(text)) {
      handleDownloadPDF();
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

  const handleDownloadPDF = () => {
    if (!booking) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const bookingDateStr = new Date(booking.bookedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const bookingTimeStr = new Date(booking.bookedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 15, marginR = 15;
    const contentW = pageW - marginL - marginR;
    let y = 12;

    // Header block — blue-ish
    doc.setFillColor(0, 87, 163);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Routine Immunization Appointment Details', pageW / 2, 9, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Ministry of Health & Family Welfare, Government of India', pageW / 2, 15.5, { align: 'center' });
    y = 26;

    // Section: Beneficiary
    doc.setFillColor(235, 240, 250);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 57, 107);
    doc.text('DETAILS OF BENEFICIARY', pageW / 2, y + 4.8, { align: 'center' });
    y += 10;

    const benefRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(label + ':', marginL, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(value, marginL + 55, y);
      y += 7;
    };

    benefRow('Beneficiary Name', booking.childName);
    benefRow('Parent / Guardian', 'Parent');
    benefRow('Reference ID', booking.refId);
    benefRow('Date of Booking', `${bookingDateStr}  ${bookingTimeStr}`);

    y += 3;
    doc.setFillColor(235, 240, 250);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 57, 107);
    doc.text('APPOINTMENT DETAILS', pageW / 2, y + 4.8, { align: 'center' });
    y += 10;

    const aptRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(label + ':', marginL, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(value, contentW - 70);
      doc.text(lines, marginL + 65, y);
      y += Math.max(lines.length * 6, 7);
    };

    aptRow('Session Site Name', booking.sessionSite.replace('SESSION SITE : ', ''));
    aptRow('Session Site Address', booking.facilityAddress);
    aptRow('Date of Vaccination Session', formatDate(new Date(booking.date)));
    aptRow('Time of Vaccination Session', booking.time);
    aptRow('Type', 'UIP Routine Immunization');

    y += 5;
    // Secret code box
    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(200, 150, 0);
    doc.roundedRect(marginL, y, contentW, 18, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(120, 80, 0);
    doc.text(`Your 4-digit Secret Code:  ${booking.secretCode}`, pageW / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 80, 0);
    doc.text('Show this code to the health worker at the vaccination site', pageW / 2, y + 13, { align: 'center' });
    y += 24;

    // Note
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(220, 220, 220);
    doc.rect(marginL, y, contentW, 16, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(
      'Note: The beneficiary will be given all age-appropriate due vaccines available at the session site, as prescribed under the National Immunization Schedule (NIS).',
      contentW - 6
    );
    doc.text(noteLines, marginL + 3, y + 5);

    y += 22;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('This is a computer-generated appointment slip from Raksha Setu. For queries call 104.', pageW / 2, y, { align: 'center' });

    doc.save(`Appointment_${booking.refId}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/60 flex flex-col justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '94vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── SLOT SELECTION ─── */}
        {step === 'slots' && (
          <>
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
                <ArrowLeft size={18} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Book Appointment for Routine Vaccination</h2>
                <p className="text-[11px] text-gray-500">{facility.city} · {pincode}</p>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="px-4 pt-3">
                <SwasthyaSewaGuide
                  prompt={slotPrompt}
                  language={language}
                  onTranscript={handleSlotVoiceCommand}
                  autoListen
                  showUi={false}
                />
              </div>

              {/* Pincode tabs */}
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

              {/* Date strip */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Slot Search Results</h3>
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
                  <span className="text-yellow-700 text-[10px] font-bold mt-0.5 shrink-0">⚠ IMPORTANT</span>
                  <p className="text-[10px] text-yellow-800">
                    Search is limited to session sites tagged with Pincode and all session sites will not be available.
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button onClick={() => setDateOffset(Math.max(0, dateOffset - 1))} disabled={dateOffset === 0}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 shrink-0">
                    <ChevronLeft size={13} />
                  </button>
                  <div className="flex-1 grid grid-cols-5 gap-1">
                    {visibleDates.map((d, i) => {
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <div key={i} className="text-center">
                          <p className={`text-[10px] font-bold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                            {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </p>
                          <p className={`text-[10px] ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                            {d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setDateOffset(Math.min(3, dateOffset + 1))} disabled={dateOffset >= 3}
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 shrink-0">
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Session site cards */}
              <div className="px-4 py-3 space-y-3">
                {sessionSites.map((site) => {
                  const siteSlots = slotsPerSite[site.id];
                  return (
                    <div key={site.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                      {/* Site header */}
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

                      {/* Slot grid — 5 days columns */}
                      <div className="grid grid-cols-5 divide-x divide-gray-100 dark:divide-gray-700">
                        {visibleDates.map((d, i) => {
                          const key = d.toDateString();
                          const slot = siteSlots[key];
                          const isSelected = selectedSite?.id === site.id && selectedDate?.toDateString() === key;
                          const isFull = !slot?.available;
                          return (
                            <button
                              key={i}
                              disabled={isFull}
                              onClick={() => { setSelectedDate(d); setSelectedSite(site); }}
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
                                    {slot.time.split('–')[0].trim()}
                                  </p>
                                  <p className={`text-[8px] ${isSelected ? 'text-white/80' : 'text-green-700 dark:text-green-400'}`}>
                                    – {slot.time.split('–')[1]?.trim()}
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

                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 pt-1">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border border-green-300 bg-green-50" /> Available</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> NA (Full/Unavailable)</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-600" /> Selected</div>
                </div>
              </div>
            </div>

            {/* Footer */}
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
                  <button onClick={handleBook}
                    className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
                    Confirm Appointment
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

        {/* ─── CONFIRMATION ─── */}
        {step === 'confirm' && booking && (
          <>
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
              <button onClick={() => setStep('slots')} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-sm font-bold dark:text-white">Appointment Confirmed</h2>
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
                  <p className="text-white font-bold text-sm">Appointment Confirmed!</p>
                  <p className="text-white/75 text-xs">Ref ID: {booking.refId.slice(-8)}</p>
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
                    { label: 'Reference ID', value: booking.refId },
                    { label: 'Session Type', value: 'UIP Routine Immunization' },
                    { label: 'Session Site', value: booking.facilityName },
                    { label: 'Address', value: booking.facilityAddress },
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

              {/* Secret code */}
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
                <button onClick={handleDownloadPDF}
                  className="w-full h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                  <Download size={16} /> Download Appointment Slip (PDF)
                </button>
                <button onClick={() => setStep('sms')}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm flex items-center justify-center gap-2">
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

        {/* ─── SMS PREVIEW ─── */}
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
                    Dear {booking.childName}, Vaccination is scheduled on{' '}
                    <span className="font-semibold underline">{formatDate(new Date(booking.date))}</span>{' '}
                    between <span className="underline">{booking.time}</span> at{' '}
                    <span className="font-semibold">{booking.facilityName}</span>.{' '}
                    Your booking reference ID is <span className="underline">{booking.refId}</span> and your 4-digit
                    secret code is <span className="underline font-bold">{booking.secretCode}</span>. — U-WIN
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {new Date(booking.bookedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 text-center">
                Can't reply to this number. This is an automated message from U-WIN Immunization System.
              </p>
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-white dark:bg-gray-900 shrink-0 space-y-2">
              <button onClick={handleDownloadPDF}
                className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
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
