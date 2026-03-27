import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Download, Shield, Syringe, MapPin } from 'lucide-react';
import { useGetUserProfile, useGetVaccineSchedule, ScheduledVaccine, useListChildren, useMarkVaccineComplete } from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { getGetVaccineScheduleQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoiceFieldError, getVoicePrompt } from '@/lib/voicePrompts';
import { parseSpokenDate, toTitleCase } from '@/lib/voice';
import { downloadVaccinationCertificate } from '@/lib/appointmentPdf';
import { type LiveBooking, useLiveBookings } from '@/lib/bookingApi';

type Filter = 'all' | 'due' | 'completed';

function buildCertificateBooking({
  vaccine,
  childId,
  childName,
  childDob,
  childGender,
  parentName,
}: {
  vaccine: ScheduledVaccine;
  childId: string;
  childName?: string;
  childDob?: string;
  childGender?: string;
  parentName?: string;
}): LiveBooking {
  const completedAt = vaccine.completedDate || vaccine.scheduledDate;
  const referenceId = `VAC-${childId}-${vaccine.vaccineId}`.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  return {
    id: `certificate-${childId}-${vaccine.vaccineId}`,
    appointmentId: `CERT-${childId}-${vaccine.vaccineId}`,
    childId,
    childName: childName || 'Child',
    childDob,
    childGender,
    parentName: parentName || 'Parent / Guardian',
    vaccineId: vaccine.vaccineId,
    vaccineName: vaccine.name,
    centerId: `manual-${childId}-${vaccine.vaccineId}`,
    centerName: vaccine.centerName || 'Government Health Centre',
    centerAddress: vaccine.centerName || 'Government Health Centre',
    centerCity: '',
    sessionSite: vaccine.centerName || 'Government Health Centre',
    date: completedAt,
    time: 'Recorded',
    status: 'completed',
    createdAt: completedAt,
    updatedAt: completedAt,
    bookedAt: completedAt,
    refId: referenceId,
    referenceId,
    secretCode: 'NA',
    notes: 'Vaccination marked complete from schedule.',
    doctorRemarks: 'Vaccination completed successfully.',
    completedAt,
    vaccinatedAt: completedAt,
    documents: {
      appointmentSlip: false,
      cancellationSlip: false,
      rescheduleSlip: false,
      vaccinationCertificate: true,
      smsConfirmation: false,
    },
  };
}

const ScheduleIllus = () => (
  <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <radialGradient id="sface" cx="38%" cy="32%" r="62%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="60%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#D97706"/></radialGradient>
      <radialGradient id="sbody" cx="50%" cy="28%" r="65%"><stop offset="0%" stopColor="#818CF8"/><stop offset="100%" stopColor="#4F46E5"/></radialGradient>
      <filter id="ssh"><feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="rgba(0,0,0,0.18)"/></filter>
    </defs>
    {/* Calendar card (background) */}
    <rect x="38" y="8" width="30" height="32" rx="6" fill="white" filter="url(#ssh)"/>
    <rect x="38" y="8" width="30" height="10" rx="6" fill="#4F46E5"/>
    <rect x="38" y="14" width="30" height="4" fill="#4F46E5"/>
    <circle cx="43" cy="30" r="3" fill="#10B981"/><circle cx="53" cy="30" r="3" fill="#F59E0B"/><circle cx="63" cy="30" r="3" fill="#EF4444"/>
    <text x="53" y="22" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="sans-serif">Schedule</text>
    {/* Body */}
    <ellipse cx="30" cy="62" rx="16" ry="9" fill="url(#sbody)" filter="url(#ssh)"/>
    <ellipse cx="30" cy="58" rx="14" ry="7" fill="url(#sbody)"/>
    <ellipse cx="22" cy="50" rx="4" ry="9" fill="#F59E0B" transform="rotate(28 22 50)"/>
    <ellipse cx="42" cy="50" rx="4" ry="9" fill="#F59E0B" transform="rotate(-25 42 50)"/>
    <rect x="26" y="44" width="8" height="7" rx="3" fill="#F59E0B"/>
    {/* Head */}
    <ellipse cx="30" cy="37" rx="14" ry="14" fill="url(#sface)" filter="url(#ssh)"/>
    <ellipse cx="25" cy="31" rx="6" ry="3.5" fill="rgba(255,255,255,0.26)" transform="rotate(-20 25 31)"/>
    <ellipse cx="30" cy="26" rx="14" ry="7" fill="#92400E"/>
    <ellipse cx="17" cy="37" rx="4" ry="7" fill="#92400E"/>
    <ellipse cx="43" cy="37" rx="4" ry="7" fill="#92400E"/>
    <ellipse cx="25" cy="38" rx="3" ry="3.2" fill="white"/><ellipse cx="35" cy="38" rx="3" ry="3.2" fill="white"/>
    <circle cx="25.5" cy="38.5" r="2" fill="#1F2937"/><circle cx="35.5" cy="38.5" r="2" fill="#1F2937"/>
    <circle cx="26.5" cy="37.5" r="0.8" fill="white"/><circle cx="36.5" cy="37.5" r="0.8" fill="white"/>
    <ellipse cx="20" cy="41" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <ellipse cx="40" cy="41" rx="2.5" ry="2" fill="#FCA5A5" opacity="0.5"/>
    <path d="M25 44 Q30 48 35 44" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

export default function Schedule() {
  const activeChildId = useAppStore(state => state.activeChildId);
  const language = useAppStore(state => state.language);
  const parentName = useAppStore(state => state.parentName);
  const { data: schedule, isLoading } = useGetVaccineSchedule(activeChildId || '');
  const { data: profile } = useGetUserProfile();
  const { data: children = [] } = useListChildren();
  const { data: liveBookings = [] } = useLiveBookings(activeChildId || undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const [, navigate] = useLocation();

  const activeChild = useMemo(
    () => children.find((child) => child.id === activeChildId),
    [children, activeChildId]
  );

  const certificateBookingsByVaccineId = useMemo(() => {
    const records = new Map<string, LiveBooking>();
    liveBookings
      .filter((booking) =>
        booking.vaccineId &&
        ['vaccinated', 'completed'].includes(booking.status)
      )
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || b.date).getTime() - new Date(a.completedAt || a.updatedAt || a.date).getTime())
      .forEach((booking) => {
        if (!records.has(booking.vaccineId)) {
          records.set(booking.vaccineId, booking);
        }
      });
    return records;
  }, [liveBookings]);

  if (!activeChildId) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center bg-gray-50 dark:bg-gray-950">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Syringe size={22} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Please select or add a child first.</p>
      <Link href="/children">
        <button className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-2 rounded-xl">
          Add Child →
        </button>
      </Link>
    </div>
  );

  if (isLoading) return (
    <div className="p-4 space-y-2 animate-pulse bg-gray-50 dark:bg-gray-950 min-h-full">
      <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
    </div>
  );

  let displayVaccines: ScheduledVaccine[] = [];
  if (schedule) {
    if (filter === 'due') {
      displayVaccines = [...schedule.missed, ...schedule.dueToday, ...schedule.dueThisWeek];
    } else if (filter === 'completed') {
      displayVaccines = [...schedule.completed];
    } else {
      displayVaccines = [...schedule.missed, ...schedule.dueToday, ...schedule.dueThisWeek, ...schedule.upcoming, ...schedule.completed];
    }
  }

  const completedPct = Math.round(((schedule?.completedCount || 0) / (schedule?.totalCount || 1)) * 100);
  const missedCount = schedule?.missed.length ?? 0;
  const dueCount = (schedule?.dueToday.length ?? 0) + (schedule?.dueThisWeek.length ?? 0);
  const upcomingCount = schedule?.upcoming.length ?? 0;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'due', label: 'Due & Missed' },
    { key: 'completed', label: 'Completed' },
  ];

  const handleVoiceCommand = (transcript: string) => {
    const text = transcript.toLowerCase().trim();
    if (!text) return;

    if (/(due|missed|pending|today|week)/.test(text)) {
      setFilter('due');
      return;
    }

    if (/(completed|done|given|finished)/.test(text)) {
      setFilter('completed');
      return;
    }

    if (/(all|everything|full schedule)/.test(text)) {
      setFilter('all');
      return;
    }

    if (/(centre|center|book|appointment|nearest)/.test(text)) {
      navigate('/centers');
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50 dark:bg-gray-950">

      {/* Sticky header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pt-4 pb-3 sticky top-0 z-10">

        {/* Title + count */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Vaccine Schedule</h1>
            {schedule?.childName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{schedule.childName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{schedule?.completedCount || 0}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500">/{schedule?.totalCount || 0}</span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">completed</p>
            </div>
            <div className="w-14 h-14 shrink-0">
              <ScheduleIllus />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-3 overflow-hidden">
          <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${completedPct}%` }} />
        </div>

        {/* Status summary chips */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {missedCount > 0 && (
            <span className="text-[11px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-2 py-1 rounded-full">
              ⚠ {missedCount} Missed
            </span>
          )}
          {dueCount > 0 && (
            <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded-full">
              🕐 {dueCount} Due
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded-full">
              📅 {upcomingCount} Upcoming
            </span>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                filter === key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pt-3">
        <SwasthyaSewaGuide
          prompt={getVoicePrompt(language, 'schedule')}
          language={language}
          onTranscript={handleVoiceCommand}
          autoListen
          showUi={false}
        />
      </div>

      {/* Vaccine list */}
      <div className="flex-1 p-3 space-y-2">
        {displayVaccines.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            No vaccines for this filter.
          </div>
        )}
        {displayVaccines.map((vaccine, idx) => (
          <VaccineCard
            key={vaccine.id}
            vaccine={vaccine}
            index={idx}
            childId={activeChildId}
            certificateBooking={
              vaccine.status === 'completed'
                ? certificateBookingsByVaccineId.get(vaccine.vaccineId) ||
                  buildCertificateBooking({
                    vaccine,
                    childId: activeChildId,
                    childName: activeChild?.name || schedule?.childName,
                    childDob: activeChild?.dob,
                    childGender: activeChild?.gender,
                    parentName: profile?.name || parentName,
                  })
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function VaccineCard({
  vaccine,
  index,
  childId,
  certificateBooking,
}: {
  vaccine: ScheduledVaccine;
  index: number;
  childId: string;
  certificateBooking?: LiveBooking;
}) {
  const isCompleted = vaccine.status === 'completed';
  const isMissed = vaccine.status === 'missed';
  const isDue = vaccine.status === 'due_today' || vaccine.status === 'due_this_week';

  const cfg = isCompleted
    ? {
        border: 'border-green-200 dark:border-green-900',
        bg: 'bg-white dark:bg-gray-900',
        dot: 'bg-green-500',
        label: '✓ Done',
        labelCls: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
      }
    : isMissed
    ? {
        border: 'border-red-200 dark:border-red-900',
        bg: 'bg-white dark:bg-gray-900',
        dot: 'bg-red-500',
        label: '⚠ Missed',
        labelCls: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
      }
    : isDue
    ? {
        border: 'border-amber-300 dark:border-amber-800',
        bg: 'bg-white dark:bg-gray-900',
        dot: 'bg-amber-500',
        label: vaccine.status === 'due_today' ? '⚡ Today' : '🕐 This Week',
        labelCls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
      }
    : {
        border: 'border-gray-200 dark:border-gray-700',
        bg: 'bg-white dark:bg-gray-900',
        dot: 'bg-blue-400',
        label: '📅 Upcoming',
        labelCls: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      className={`rounded-xl border shadow-sm ${cfg.border} ${cfg.bg}`}
    >
      <div className="p-3.5">
        {/* Top row: dot + name + badge */}
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{vaccine.ageLabel}</p>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">{vaccine.name}</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${cfg.labelCls}`}>
                {cfg.label}
              </span>
            </div>

            {/* Date + Mandatory */}
            <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(vaccine.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {vaccine.isMandatory && (
                <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                  Mandatory
                </span>
              )}
            </div>

            {/* Action row */}
            {isCompleted ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1.5 rounded-lg border border-green-200 dark:border-green-900">
                  <Shield size={11} />
                  Given on {new Date(vaccine.completedDate || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {certificateBooking && (
                  <button
                    type="button"
                    onClick={() => downloadVaccinationCertificate(certificateBooking)}
                    className="w-full text-xs font-semibold border border-green-200 dark:border-green-800 rounded-full py-1.5 px-3 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-1"
                  >
                    <Download size={11} /> Download Certificate
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <MarkCompleteDialog vaccine={vaccine} childId={childId} />
                <Link href="/centers" className="flex-1">
                  <button className="w-full text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-full py-1.5 px-3 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1">
                    <MapPin size={11} /> Book Centre
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MarkCompleteDialog({ vaccine, childId }: { vaccine: ScheduledVaccine; childId: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [center, setCenter] = useState('');
  const [activeField, setActiveField] = useState<'date' | 'center'>('date');
  const [voiceError, setVoiceError] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const language = useAppStore(state => state.language);

  const mutation = useMarkVaccineComplete({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetVaccineScheduleQueryKey(childId) });
        setOpen(false);
        toast({ title: 'Vaccine marked as completed!' });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ childId, vaccineId: vaccine.vaccineId, data: { completedDate: date, centerName: center } });
  };

  const handleTranscript = (transcript: string) => {
    setVoiceError('');
    const clean = transcript.trim();
    if (!clean) return;

    if (activeField === 'date') {
      const parsed = parseSpokenDate(clean);
      if (!parsed) {
        setVoiceError(getVoiceFieldError(language, 'date'));
        return;
      }
      setDate(parsed);
      setActiveField('center');
      return;
    }

    if (/\b(skip|none|no center|no centre|not available)\b/i.test(clean)) {
      setCenter('');
      return;
    }

    setCenter(toTitleCase(clean));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex-1 text-xs font-bold bg-blue-600 text-white rounded-full py-1.5 px-3 hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1">
          <CheckCircle2 size={11} /> Mark Given
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-2xl dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-base dark:text-white">Mark {vaccine.name} Complete</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <SwasthyaSewaGuide
            prompt={activeField === 'date' ? getVoicePrompt(language, 'scheduleMarkDate') : getVoicePrompt(language, 'scheduleMarkCenter')}
            language={language}
            onTranscript={handleTranscript}
            autoListen
            showUi={false}
          />
          <div className="space-y-1.5" onFocusCapture={() => setActiveField('date')}>
            <label className="text-sm font-medium dark:text-gray-200">Date Given</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} onFocus={() => setActiveField('date')} required className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
          </div>
          <div className="space-y-1.5" onFocusCapture={() => setActiveField('center')}>
            <label className="text-sm font-medium dark:text-gray-200">
              Health Center <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <Input placeholder="e.g. City Hospital" value={center} onChange={e => setCenter(e.target.value)} onFocus={() => setActiveField('center')} className="dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
          </div>
          {voiceError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {voiceError}
            </div>
          )}
          <Button type="submit" className="w-full rounded-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Confirm Completion'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
