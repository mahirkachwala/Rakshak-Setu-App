import React, { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { CalendarClock, Download, History, RotateCcw, Syringe, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/store';
import {
  BOOKING_RESCHEDULE_SOURCE_KEY,
  type LiveBooking,
  useCancelLiveBooking,
  useLiveBookings,
} from '@/lib/bookingApi';
import {
  downloadAppointmentSlip,
  downloadCancellationSlip,
  downloadRescheduleSlip,
  downloadVaccinationCertificate,
} from '@/lib/appointmentPdf';

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmDestructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" onClick={(event) => event.stopPropagation()}>
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
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`flex-1 h-11 rounded-xl font-bold text-sm transition-colors ${confirmDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: LiveBooking['status']) {
  const config: Record<LiveBooking['status'], { label: string; className: string }> = {
    booked: { label: 'Booked', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
    pending: { label: 'Pending', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
    checked_in: { label: 'Checked In', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400' },
    vaccinated: { label: 'Vaccinated', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
    rescheduled: { label: 'Rescheduled', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' },
    missed: { label: 'Missed', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
    no_show: { label: 'No Show', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };

  return config[status] || config.booked;
}

export function LiveBookedAppointments({ onRefresh }: { onRefresh?: () => void }) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const { data: bookings = [] } = useLiveBookings();
  const cancelMutation = useCancelLiveBooking();
  const [cancelTarget, setCancelTarget] = useState<LiveBooking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<LiveBooking | null>(null);
  const [, navigate] = useLocation();

  const active = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings
      .filter((booking) => !['cancelled', 'completed', 'rescheduled', 'missed', 'no_show'].includes(booking.status))
      .filter((booking) => new Date(booking.date) >= today)
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  }, [bookings]);

  if (active.length === 0) return null;

  const handleCancel = async (booking: LiveBooking) => {
    await cancelMutation.mutateAsync({ id: booking.id, reason: 'Cancelled from the parent app.' });
    setCancelTarget(null);
    onRefresh?.();
  };

  const handleReschedule = (booking: LiveBooking) => {
    window.sessionStorage.setItem(BOOKING_RESCHEDULE_SOURCE_KEY, booking.id);
    setRescheduleTarget(null);
    navigate('/centers');
    onRefresh?.();
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
          onConfirm={() => void handleCancel(cancelTarget)}
          onCancel={() => setCancelTarget(null)}
        />
      )}
      {rescheduleTarget && (
        <ConfirmDialog
          title={t('rescheduleConfirmTitle')}
          message={t('rescheduleConfirmMsg')}
          confirmLabel={t('confirmReschedule')}
          cancelLabel={t('noKeepIt')}
          onConfirm={() => handleReschedule(rescheduleTarget)}
          onCancel={() => setRescheduleTarget(null)}
        />
      )}

      <div>
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <CalendarClock size={12} /> {t('bookedAppointments')}
        </h3>
        <div className="space-y-2">
          {active.slice(0, 3).map((booking) => {
            const bookingDate = new Date(booking.date);
            const badge = getStatusBadge(booking.status);
            const canCancel = ['booked', 'pending', 'checked_in'].includes(booking.status);
            const canReschedule = ['booked', 'pending', 'checked_in'].includes(booking.status);

            return (
              <div key={booking.id} className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-3 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <Syringe size={15} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{booking.centerName}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {bookingDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {booking.time.split('-')[0].trim()}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {booking.childName} · {t('code')}: <span className="font-bold text-amber-600">{booking.secretCode}</span>
                    </p>
                    {booking.doctorRemarks && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        Doctor note: {booking.doctorRemarks}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>{badge.label}</span>
                </div>
                <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                  <button onClick={() => downloadAppointmentSlip(booking)} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg py-1.5">
                    <Download size={11} /> {t('slip')}
                  </button>
                  {canReschedule && (
                    <button onClick={() => setRescheduleTarget(booking)} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5">
                      <RotateCcw size={11} /> {t('reschedule')}
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => setCancelTarget(booking)} className="flex items-center justify-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg py-1.5 px-2.5">
                      <X size={11} /> {t('cancelAppt')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function LiveAppointmentHistory() {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;
  const { data: bookings = [] } = useLiveBookings();
  const [expanded, setExpanded] = useState(false);

  const bookingById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);
  const history = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookings
      .filter(
        (booking) =>
          ['cancelled', 'completed', 'rescheduled', 'missed', 'no_show'].includes(booking.status) ||
          new Date(booking.date) < today,
      )
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [bookings]);

  if (history.length === 0) return null;

  const shown = expanded ? history : history.slice(0, 2);

  const handleDownload = (booking: LiveBooking) => {
    if (booking.status === 'completed') {
      downloadVaccinationCertificate(booking);
      return;
    }
    if (booking.status === 'cancelled') {
      downloadCancellationSlip(booking);
      return;
    }
    if (booking.status === 'rescheduled') {
      downloadRescheduleSlip(booking, booking.rescheduledToAppointmentId ? bookingById.get(booking.rescheduledToAppointmentId) : undefined);
      return;
    }
    downloadAppointmentSlip(booking);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <History size={12} /> {t('appointmentHistory')}
        </h3>
        {history.length > 2 && (
          <button onClick={() => setExpanded((value) => !value)} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            {expanded ? t('showLess') : `${t('viewAll')} ${history.length} →`}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {shown.map((booking) => {
          const badge = getStatusBadge(booking.status);
          const bookingDate = new Date(booking.date);
          const label =
            booking.status === 'completed'
              ? 'Vaccination Certificate'
              : booking.status === 'cancelled'
                ? t('cancellationSlip')
                : booking.status === 'rescheduled'
                  ? 'Reschedule Slip'
                  : t('downloadSlip');

          return (
            <div key={booking.id} className="bg-white dark:bg-gray-900 border rounded-xl p-3 shadow-sm opacity-90 border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${badge.className}`}>
                  {booking.status === 'completed' ? <CheckCircle2 size={15} /> : <Syringe size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{booking.centerName}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {bookingDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {booking.childName} · {booking.vaccineName}
                  </p>
                  {booking.doctorRemarks && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Doctor note: {booking.doctorRemarks}</p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>{badge.label}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2">
                <button onClick={() => handleDownload(booking)} className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-3">
                  <Download size={11} /> {label}
                </button>
                {booking.status === 'completed' && (
                  <button onClick={() => downloadAppointmentSlip(booking)} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg py-1.5 px-3">
                    <Download size={11} /> Appointment Slip
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

