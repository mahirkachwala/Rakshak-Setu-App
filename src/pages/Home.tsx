import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, ShieldCheck, ShieldAlert, AlertCircle, ChevronRight, ChevronLeft,
  CalendarClock, Syringe,
  CheckCircle2, Zap, TrendingUp, Calendar, Clock, CheckCheck,
  Download, X, RotateCcw, History, AlertTriangle
} from 'lucide-react';
import { useGetDashboardSummary, useListChildren, useGetVaccineSchedule } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';
import { getGreeting } from '@/lib/utils';
import { useAppStore } from '@/store';
import { getSavedBookings, cancelBooking, SavedBooking } from '@/components/BookingModal';
import { LiveAppointmentHistory, LiveBookedAppointments } from '@/components/home/LiveAppointments';
import { PinStatusCard } from '@/pages/PinStatus';
import { jsPDF } from 'jspdf';
import type { Language } from '@/store';

function buildPDF(b: SavedBooking, isCancelled: boolean) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const bookingDateStr = new Date(b.bookedAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const bookingTimeStr = new Date(b.bookedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 15, marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 12;

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

  if (isCancelled) {
    doc.setTextColor(200, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('** CANCELLED **', pageW / 2, y + 6, { align: 'center' });
    y += 16;
  }

  doc.setFillColor(235, 240, 250);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 57, 107);
  doc.text('DETAILS OF BENEFICIARY', pageW / 2, y + 4.8, { align: 'center' });
  y += 10;

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text(label + ':', marginL, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text(value, marginL + 55, y);
    y += 7;
  };
  row('Beneficiary Name', b.childName);
  row('Reference ID', b.refId);
  row('Date of Booking', `${bookingDateStr}  ${bookingTimeStr}`);
  if (isCancelled && b.cancelledAt) {
    row('Cancelled On', new Date(b.cancelledAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  }

  y += 3;
  doc.setFillColor(235, 240, 250);
  doc.rect(marginL, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 57, 107);
  doc.text('APPOINTMENT DETAILS', pageW / 2, y + 4.8, { align: 'center' });
  y += 10;

  const aptRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text(label + ':', marginL, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value, contentW - 70);
    doc.text(lines, marginL + 65, y);
    y += Math.max(lines.length * 6, 7);
  };
  aptRow('Session Site Name', b.sessionSite.replace('SESSION SITE : ', ''));
  aptRow('Session Site Address', b.facilityAddress);
  aptRow('Date of Vaccination Session', new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'));
  aptRow('Time of Vaccination Session', b.time);
  aptRow('Type', 'UIP Routine Immunization');
  aptRow('Status', isCancelled ? 'CANCELLED' : 'CONFIRMED');

  y += 5;
  if (!isCancelled) {
    doc.setFillColor(255, 243, 205); doc.setDrawColor(200, 150, 0);
    doc.roundedRect(marginL, y, contentW, 18, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(120, 80, 0);
    doc.text(`Your 4-digit Secret Code:  ${b.secretCode}`, pageW / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 80, 0);
    doc.text('Show this code to the health worker at the vaccination site', pageW / 2, y + 13, { align: 'center' });
    y += 24;
  }

  doc.setFillColor(248, 248, 248); doc.setDrawColor(220, 220, 220);
  doc.rect(marginL, y, contentW, 14, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
  const noteLines = doc.splitTextToSize(
    isCancelled
      ? 'This appointment has been cancelled. To rebook, please visit Raksha Setu or your nearest health centre.'
      : 'Note: The beneficiary will be given all age-appropriate due vaccines available at the session site, as prescribed under the National Immunization Schedule (NIS).',
    contentW - 6
  );
  doc.text(noteLines, marginL + 3, y + 5);

  y += 20;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
  doc.text('This is a computer-generated slip from Raksha Setu. For queries call 104.', pageW / 2, y, { align: 'center' });

  doc.save(`Appointment_${b.refId}${isCancelled ? '_CANCELLED' : ''}.pdf`);
}

function ConfirmDialog({
  title, message, confirmLabel, cancelLabel, confirmDestructive,
  onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; cancelLabel: string;
  confirmDestructive?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmDestructive ? 'bg-red-100 dark:bg-red-950/50' : 'bg-blue-100 dark:bg-blue-950/50'}`}>
            <AlertTriangle size={18} className={confirmDestructive ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl font-bold text-sm transition-colors ${
              confirmDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookedAppointments({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const [bookings, setBookings] = useState<SavedBooking[]>(() => getSavedBookings());
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<SavedBooking | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const refresh = () => setBookings(getSavedBookings());
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const active = bookings.filter(b => b.status !== 'cancelled' && new Date(b.date) >= today);

  if (active.length === 0) return null;

  const doCancel = (id: string) => {
    cancelBooking(id);
    setBookings(getSavedBookings());
    setCancelTarget(null);
    onRefresh();
  };

  const doReschedule = () => {
    if (rescheduleTarget) {
      cancelBooking(rescheduleTarget.id);
      setBookings(getSavedBookings());
      onRefresh();
    }
    setRescheduleTarget(null);
    navigate('/centers');
  };

  return (
    <>
      {cancelTarget && (
        <ConfirmDialog
          title={t('cancelConfirmTitle')}
          message={t('cancelConfirmMsg')}
          confirmLabel={t('confirmCancel')}
          cancelLabel={t('noKeepIt')}
          confirmDestructive
          onConfirm={() => doCancel(cancelTarget)}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {rescheduleTarget && (
        <ConfirmDialog
          title={t('rescheduleConfirmTitle')}
          message={t('rescheduleConfirmMsg')}
          confirmLabel={t('confirmReschedule')}
          cancelLabel={t('noKeepIt')}
          onConfirm={doReschedule}
          onCancel={() => setRescheduleTarget(null)}
        />
      )}
      <div>
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <CalendarClock size={12} /> {t('bookedAppointments')}
        </h3>
        <div className="space-y-2">
          {active.slice(0, 3).map((b) => {
            const bDate = new Date(b.date);
            return (
              <div key={b.id} className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <Syringe size={15} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{b.facilityName}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {bDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {b.time.split('–')[0].trim()}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {b.childName} · {t('code')}: <span className="font-bold text-amber-600">{b.secretCode}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">{t('upcomingBadge')}</span>
                </div>
                <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => buildPDF(b, false)}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg py-1.5">
                    <Download size={11} /> {t('slip')}
                  </button>
                  <button
                    onClick={() => setRescheduleTarget(b)}
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5">
                    <RotateCcw size={11} /> {t('reschedule')}
                  </button>
                  <button
                    onClick={() => setCancelTarget(b.id)}
                    className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg py-1.5 px-2.5">
                    <X size={11} /> {t('cancelAppt')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function AppointmentHistory() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const [bookings, setBookings] = useState<SavedBooking[]>(() => getSavedBookings());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const refresh = () => setBookings(getSavedBookings());
    window.addEventListener('focus', refresh);
    window.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const history = bookings.filter(b =>
    b.status === 'cancelled' || new Date(b.date) < today
  );

  if (history.length === 0) return null;

  const shown = expanded ? history : history.slice(0, 2);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <History size={12} /> {t('appointmentHistory')}
        </h3>
        {history.length > 2 && (
          <button onClick={() => setExpanded(v => !v)} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            {expanded ? t('showLess') : `${t('viewAll')} ${history.length} →`}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {shown.map((b) => {
          const isCancelled = b.status === 'cancelled';
          const bDate = new Date(b.date);
          return (
            <div key={b.id} className={`bg-white dark:bg-gray-900 border rounded-xl p-3 shadow-sm opacity-80 ${
              isCancelled ? 'border-red-200 dark:border-red-900' : 'border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isCancelled ? 'bg-red-50 dark:bg-red-950/30' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <Syringe size={15} className={isCancelled ? 'text-red-400' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{b.facilityName}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {bDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{b.childName}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  isCancelled
                    ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {isCancelled ? t('cancelledBadge') : t('completed')}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => buildPDF(b, isCancelled)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-3">
                  <Download size={11} /> {isCancelled ? t('cancellationSlip') : t('downloadSlip')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: { date: Date; curMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), curMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d), curMonth: true });
  let extra = 1;
  while (cells.length % 7 !== 0) cells.push({ date: new Date(year, month + 1, extra++), curMonth: false });
  return cells;
}

const HomeBabyIllus = () => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <radialGradient id="hface" cx="38%" cy="32%" r="62%"><stop offset="0%" stopColor="#FEF3C7"/><stop offset="60%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#D97706"/></radialGradient>
      <radialGradient id="hbody" cx="50%" cy="28%" r="65%"><stop offset="0%" stopColor="#60A5FA"/><stop offset="100%" stopColor="#2563EB"/></radialGradient>
      <filter id="hsh"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(0,0,0,0.18)"/></filter>
    </defs>
    {/* Sun rays */}
    <circle cx="66" cy="14" r="10" fill="#FDE68A" opacity="0.7"/>
    {[0,45,90,135,180,225,270,315].map(a => (
      <line key={a} x1={66+10*Math.cos(a*Math.PI/180)} y1={14+10*Math.sin(a*Math.PI/180)}
        x2={66+16*Math.cos(a*Math.PI/180)} y2={14+16*Math.sin(a*Math.PI/180)}
        stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
    ))}
    {/* Body */}
    <ellipse cx="40" cy="66" rx="18" ry="10" fill="url(#hbody)" filter="url(#hsh)"/>
    <ellipse cx="40" cy="61" rx="15" ry="8" fill="url(#hbody)"/>
    <ellipse cx="34" cy="56" rx="6" ry="2.5" fill="rgba(255,255,255,0.25)" transform="rotate(-15 34 56)"/>
    {/* Arms */}
    <ellipse cx="24" cy="57" rx="4" ry="9" fill="#F59E0B" transform="rotate(25 24 57)"/>
    <ellipse cx="56" cy="57" rx="4" ry="9" fill="#F59E0B" transform="rotate(-25 56 57)"/>
    {/* Neck */}
    <rect x="36" y="49" width="8" height="7" rx="3" fill="#F59E0B"/>
    {/* Head */}
    <ellipse cx="40" cy="42" rx="16" ry="16" fill="url(#hface)" filter="url(#hsh)"/>
    <ellipse cx="35" cy="36" rx="6" ry="4" fill="rgba(255,255,255,0.26)" transform="rotate(-22 35 36)"/>
    {/* Hair */}
    <ellipse cx="40" cy="30" rx="16" ry="8" fill="#92400E"/>
    <ellipse cx="25" cy="42" rx="4.5" ry="8" fill="#92400E"/>
    <ellipse cx="55" cy="42" rx="4.5" ry="8" fill="#92400E"/>
    {/* Eyes */}
    <ellipse cx="34" cy="43" rx="3" ry="3.5" fill="white"/><ellipse cx="46" cy="43" rx="3" ry="3.5" fill="white"/>
    <circle cx="34.5" cy="43.5" r="2" fill="#1F2937"/><circle cx="46.5" cy="43.5" r="2" fill="#1F2937"/>
    <circle cx="35.5" cy="42.5" r="0.8" fill="white"/><circle cx="47.5" cy="42.5" r="0.8" fill="white"/>
    {/* Cheeks & smile */}
    <ellipse cx="28" cy="46" rx="3" ry="2.5" fill="#FCA5A5" opacity="0.5"/>
    <ellipse cx="52" cy="46" rx="3" ry="2.5" fill="#FCA5A5" opacity="0.5"/>
    <path d="M35 49 Q40 54 45 49" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    {/* Green badge */}
    <circle cx="54" cy="30" r="9" fill="#10B981" filter="url(#hsh)"/>
    <path d="M50 30 L53 33 L58 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const HOME_COPY: Record<Language, {
  next: string;
  today: string;
  inDays: (days: number) => string;
  vaccineHint: string;
}> = {
  en: { next: 'Next', today: 'Today', inDays: (days) => `In ${days}d`, vaccineHint: 'Check vial safety' },
  hi: { next: 'अगला', today: 'आज', inDays: (days) => `${days} दिन में`, vaccineHint: 'वायल सुरक्षा जांचें' },
  mr: { next: 'पुढील', today: 'आज', inDays: (days) => `${days} दिवसांनी`, vaccineHint: 'व्हायल सुरक्षित आहे का पाहा' },
  bn: { next: 'পরবর্তী', today: 'আজ', inDays: (days) => `${days} দিনের মধ্যে`, vaccineHint: 'ভায়াল নিরাপত্তা দেখুন' },
  te: { next: 'తదుపరి', today: 'ఈ రోజు', inDays: (days) => `${days} రోజుల్లో`, vaccineHint: 'వయల్ సురక్షితమా చూడండి' },
  ta: { next: 'அடுத்து', today: 'இன்று', inDays: (days) => `${days} நாளில்`, vaccineHint: 'வயல் பாதுகாப்பை பார்க்கவும்' },
  kn: { next: 'ಮುಂದಿನದು', today: 'ಇಂದು', inDays: (days) => `${days} ದಿನಗಳಲ್ಲಿ`, vaccineHint: 'ವಯಲ್ ಸುರಕ್ಷತೆ ನೋಡಿ' },
  gu: { next: 'આગળનું', today: 'આજે', inDays: (days) => `${days} દિવસમાં`, vaccineHint: 'વાયલ સલામતી તપાસો' },
  ml: { next: 'അടുത്തത്', today: 'ഇന്ന്', inDays: (days) => `${days} ദിവസത്തിൽ`, vaccineHint: 'വയൽ സുരക്ഷ നോക്കൂ' },
  pa: { next: 'ਅਗਲਾ', today: 'ਅੱਜ', inDays: (days) => `${days} ਦਿਨ ਵਿੱਚ`, vaccineHint: 'ਵਾਇਲ ਸੁਰੱਖਿਆ ਵੇਖੋ' },
  or: { next: 'ପରବର୍ତ୍ତୀ', today: 'ଆଜି', inDays: (days) => `${days} ଦିନରେ`, vaccineHint: 'ଭାଇଆଲ ସୁରକ୍ଷା ଦେଖନ୍ତୁ' },
  as: { next: 'পৰৱৰ্তী', today: 'আজি', inDays: (days) => `${days} দিনত`, vaccineHint: 'ভায়েল সুৰক্ষা চাওক' },
};

export default function Home() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const activeChildId = useAppStore(state => state.activeChildId);
  const parentName = useAppStore(state => state.parentName);
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: childrenList } = useListChildren();
  const { data: vaccineSchedule } = useGetVaccineSchedule(
    activeChildId ? String(activeChildId) : '',
    { query: { enabled: !!activeChildId } }
  );

  const todayDate = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [bookingKey, setBookingKey] = useState(0);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const uiCopy = HOME_COPY[language] ?? HOME_COPY.en;

  const normalizedChildrenList = Array.isArray(childrenList) ? childrenList : [];
  const normalizedSummaryChildren = Array.isArray(summary?.children) ? summary.children : [];
  const activeChild = normalizedChildrenList.find(c => c.id === activeChildId) || normalizedSummaryChildren[0];
  const pct = activeChild ? Math.round((activeChild.completedVaccines / activeChild.totalVaccines) * 100) : 0;

  const allVaccines = useMemo(() => {
    if (!vaccineSchedule) return [];
    return [
      ...(vaccineSchedule.dueToday || []),
      ...(vaccineSchedule.dueThisWeek || []),
      ...(vaccineSchedule.upcoming || []),
      ...(vaccineSchedule.missed || []),
      ...(vaccineSchedule.completed || []),
    ];
  }, [vaccineSchedule]);

  const vaccinesByDate = useMemo(() => {
    const map: Record<string, typeof allVaccines> = {};
    allVaccines.forEach(v => {
      if (v.scheduledDate) {
        const key = new Date(v.scheduledDate).toDateString();
        if (!map[key]) map[key] = [];
        map[key].push(v);
      }
    });
    return map;
  }, [allVaccines]);

  const cells = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 7 + index))),
    [locale],
  );

  const todayVaccines = useMemo(() => {
    const todayKey = todayDate.toDateString();
    return vaccinesByDate[todayKey] || [];
  }, [vaccinesByDate, todayDate]);

  // Upcoming: dueThisWeek + upcoming + missed (sorted by date, limited to 5)
  const upcomingVaccines = useMemo(() => {
    if (!vaccineSchedule) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [
      ...(vaccineSchedule.dueThisWeek || []),
      ...(vaccineSchedule.upcoming || []),
    ]
      .filter(v => new Date(v.scheduledDate) >= today || vaccineSchedule.dueToday?.includes(v))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 5);
  }, [vaccineSchedule]);

  // Missed vaccines separately
  const missedVaccines = useMemo(() => {
    if (!vaccineSchedule) return [];
    return (vaccineSchedule.missed || []).slice(0, 3);
  }, [vaccineSchedule]);

  const past = useMemo(() => (vaccineSchedule?.completed || []).slice(-3).reverse(), [vaccineSchedule]);

  const missedCount = summary?.missedCount ?? 0;
  const upcomingCount = summary?.upcomingCount ?? 0;

  const todayMsg = missedCount > 0
    ? `${missedCount} ${t('vaccinesMissed')}`
    : upcomingCount > 0
    ? `${upcomingCount} ${t('vaccinesDueWeek')}`
    : t('allUpToDate');
  const todayUrgent = missedCount > 0 || upcomingCount > 0;

  const selectedKey = selectedDay.toDateString();
  const selectedVaccines = vaccinesByDate[selectedKey] || [];

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  if (isLoading) return (
    <div className="p-4 space-y-3 animate-pulse">
      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  );

  const statusBorder = activeChild?.status === 'safe' ? 'border-l-green-500' : activeChild?.status === 'due' ? 'border-l-amber-500' : 'border-l-red-500';
  const statusBg = activeChild?.status === 'safe' ? 'bg-green-50 dark:bg-green-950/30' : activeChild?.status === 'due' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-red-50 dark:bg-red-950/30';
  const statusText = activeChild?.status === 'safe' ? 'text-green-700 dark:text-green-400' : activeChild?.status === 'due' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400';

  const childStatusLabel = activeChild?.status === 'safe'
    ? t('safeStatus')
    : activeChild?.status === 'due'
    ? t('dueStatus')
    : t('missedStatus');

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-full">

      {/* Status card */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">{new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t(getGreeting())}, {parentName || activeChild?.name || t('parentAccount')}! 👋</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/schedule">
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900">
                <TrendingUp size={11} /> {pct}% {t('vaccineDone')}
              </div>
            </Link>
            <div className="w-16 h-16 shrink-0">
              <HomeBabyIllus />
            </div>
          </div>
        </div>

        {activeChild && (
          <div className={`border-l-4 ${statusBorder} ${statusBg} rounded-r-xl px-3 py-2.5`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {activeChild.status === 'safe'
                    ? <ShieldCheck size={14} className="text-green-600 dark:text-green-400" />
                    : activeChild.status === 'due'
                    ? <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                    : <ShieldAlert size={14} className="text-red-600 dark:text-red-400" />}
                  <span className={`text-xs font-bold ${statusText}`}>
                    {activeChild.name} · {childStatusLabel}
                  </span>
                </div>
                {activeChild.nextVaccineName && (
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    {uiCopy.next}: <span className="font-semibold">{activeChild.nextVaccineName}</span>
                    {activeChild.nextVaccineDate && <> · {new Date(activeChild.nextVaccineDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</>}
                  </p>
                )}
              </div>
              <Link href="/schedule">
                <button className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg px-2.5 py-1 shadow-sm">
                  {t('schedule')} →
                </button>
              </Link>
            </div>
            <div className="mt-2">
              <div className="h-1.5 bg-white/70 dark:bg-gray-800/70 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {activeChild.completedVaccines} / {activeChild.totalVaccines} {t('completed')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alert banner */}
      {todayUrgent && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900">
          <Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex-1">{todayMsg}</p>
          <Link href="/centers">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-lg">{t('bookAppointment')}</span>
          </Link>
        </div>
      )}

      <div className="p-4 space-y-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{uiCopy.vaccineHint}</p>
              <h3 className="mt-1 text-base font-black tracking-tight text-gray-900 dark:text-white">{uiCopy.vaccineHint}</h3>
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              {t('home')}
            </div>
          </div>
          <PinStatusCard embedded />
        </section>

        {/* MISSED VACCINES (if any) */}
        {missedVaccines.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertCircle size={12} /> {t('missed')} ({missedVaccines.length})
            </h3>
            <div className="space-y-1.5">
              {missedVaccines.map((v, i) => (
                <div key={`missed-${v.name}-${i}`} className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-gray-900 border-red-200 dark:border-red-900">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                    <Syringe size={14} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{v.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{v.ageLabel}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">{t('missed')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODAY'S VACCINES */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar size={12} /> {t('todayVaccines')}
          </h3>
          {todayVaccines.length > 0 ? (
            <div className="space-y-1.5">
              {todayVaccines.map((v, i) => (
                <div key={`today-${v.name}-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                  v.status === 'completed' ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-900' :
                  v.status === 'missed' ? 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-900' :
                  'bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-900'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    v.status === 'completed' ? 'bg-green-100 dark:bg-green-950/50' :
                    v.status === 'missed' ? 'bg-red-100 dark:bg-red-950/50' : 'bg-amber-100 dark:bg-amber-950/50'
                  }`}>
                    <Syringe size={14} className={v.status === 'completed' ? 'text-green-600' : v.status === 'missed' ? 'text-red-600' : 'text-amber-600'} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{v.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{v.ageLabel}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    v.status === 'completed' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' :
                    v.status === 'missed' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                  }`}>
                    {v.status === 'completed' ? t('completed') : v.status === 'missed' ? t('missed') : t('dueStatus')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-400 dark:text-gray-500">
              {t('allUpToDate')}
            </div>
          )}
        </div>

        {/* BOOKED APPOINTMENTS */}
        <LiveBookedAppointments key={bookingKey} onRefresh={() => setBookingKey(k => k + 1)} />

        {/* CALENDAR */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
              <ChevronLeft size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {new Date(calYear, calMonth).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </h3>
              {vaccinesByDate && Object.keys(vaccinesByDate).length > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400">{Object.keys(vaccinesByDate).length} {t('vaccinesDue')}</p>
              )}
            </div>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
              <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 py-1.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 p-1 gap-px">
            {cells.map(({ date, curMonth }) => {
              const key = date.toDateString();
              const isToday = key === todayDate.toDateString();
              const isSelected = key === selectedDay.toDateString();
              const cellVaccines = vaccinesByDate[key] || [];
              const hasMissed = cellVaccines.some(v => v.status === 'missed');
              const hasDue = cellVaccines.some(v => v.status === 'due_today' || v.status === 'due_this_week');
              const hasCompleted = cellVaccines.some(v => v.status === 'completed');
              const hasUpcoming = cellVaccines.some(v => v.status === 'upcoming');
              const hasVaccine = cellVaccines.length > 0;
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedDay(date); setCalYear(date.getFullYear()); setCalMonth(date.getMonth()); }}
                  className={`relative flex flex-col items-center py-1.5 px-1 rounded-lg transition-all ${
                    isSelected ? 'bg-blue-600 text-white' :
                    isToday ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold' :
                    curMonth ? 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200' :
                    'text-gray-300 dark:text-gray-700'
                  }`}
                >
                  <span className={`text-xs ${isSelected ? 'font-bold text-white' : isToday ? 'font-bold' : 'font-medium'}`}>
                    {date.getDate()}
                  </span>
                  {hasVaccine && curMonth && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasMissed && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-red-300' : 'bg-red-500'}`} />}
                      {hasDue && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-yellow-300' : 'bg-amber-500'}`} />}
                      {hasCompleted && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'}`} />}
                      {hasUpcoming && !hasDue && !hasMissed && !hasCompleted && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-blue-200' : 'bg-blue-400'}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day vaccines */}
          {selectedVaccines.length > 0 ? (
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                {selectedDay.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              {selectedVaccines.map((v, i) => (
                <div key={`sel-${v.name}-${i}`} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    v.status === 'completed' ? 'bg-green-500' : v.status === 'missed' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium flex-1">{v.name}</span>
                  <span className={`text-[10px] font-bold capitalize ${
                    v.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                    v.status === 'missed' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {v.status === 'completed' ? t('completed') : v.status === 'missed' ? t('missed') : t('dueStatus')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">{t('selectDateVaccines')}</p>
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
            {[
              { color: 'bg-green-500', label: t('completed') },
              { color: 'bg-amber-500', label: t('dueStatus') },
              { color: 'bg-red-500', label: t('missed') },
              { color: 'bg-blue-400', label: t('upcoming') },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* UPCOMING VACCINES */}
        {upcomingVaccines.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} /> {t('upcomingVaccines')}
              </h3>
              <Link href="/schedule">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{t('viewAll')} →</span>
              </Link>
            </div>
            <div className="space-y-1.5">
              {upcomingVaccines.map((v, i) => {
                const schedDate = new Date(v.scheduledDate);
                const daysUntil = Math.ceil((schedDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={`up-${v.id || v.name}-${i}`} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      daysUntil <= 7 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-blue-50 dark:bg-blue-950/30'
                    }`}>
                      <Syringe size={14} className={daysUntil <= 7 ? 'text-amber-600' : 'text-blue-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{v.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{schedDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      daysUntil === 0 ? 'bg-amber-500 text-white' :
                      daysUntil <= 7 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' :
                      'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                    }`}>
                      {daysUntil === 0 ? uiCopy.today : uiCopy.inDays(daysUntil)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* APPOINTMENT HISTORY */}
        <LiveAppointmentHistory key={bookingKey} />

        {/* RECENT COMPLETED */}
        {past.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <CheckCheck size={12} /> {t('recentCompleted')}
            </h3>
            <div className="space-y-1.5">
              {past.map((v, i) => (
                <div key={`past-${v.id || v.name}-${i}`} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-900 rounded-xl p-2.5 shadow-sm">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{v.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{v.ageLabel}</p>
                  </div>
                  <span className="text-[10px] font-bold text-green-600 dark:text-green-400">{t('completed')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
