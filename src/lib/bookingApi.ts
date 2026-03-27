import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type LiveBookingStatus =
  | 'booked'
  | 'checked_in'
  | 'vaccinated'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'pending'
  | 'missed'
  | 'no_show';

export interface LiveBooking {
  id: string;
  appointmentId: string;
  childId: string;
  childName: string;
  childDob?: string;
  childGender?: string;
  parentName: string;
  parentPhone?: string;
  vaccineId: string;
  vaccineName: string;
  centerId: string;
  centerName: string;
  centerAddress?: string;
  centerCity?: string;
  sessionSite?: string;
  date: string;
  time: string;
  status: LiveBookingStatus;
  createdAt: string;
  updatedAt?: string;
  bookedAt: string;
  refId: string;
  referenceId: string;
  secretCode: string;
  notes?: string;
  doctorRemarks?: string;
  cancelReason?: string;
  batchNumber?: string;
  administeredBy?: string;
  checkedInAt?: string;
  vaccinatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rescheduledAt?: string;
  rescheduledToAppointmentId?: string;
  rescheduledFromAppointmentId?: string;
  documents: {
    appointmentSlip: boolean;
    cancellationSlip: boolean;
    rescheduleSlip: boolean;
    vaccinationCertificate: boolean;
    smsConfirmation: boolean;
  };
}

export interface CreateBookingPayload {
  childId: string;
  vaccineId?: string;
  vaccineName?: string;
  centerId: string;
  centerName: string;
  centerAddress?: string;
  centerCity?: string;
  sessionSite?: string;
  date: string;
  time: string;
}

export interface RescheduleBookingPayload {
  newDate: string;
  newTime: string;
  newCenterId?: string;
  newCenterName?: string;
  newCenterAddress?: string;
  newCenterCity?: string;
  newSessionSite?: string;
  remarks?: string;
}

export const BOOKING_RESCHEDULE_SOURCE_KEY = 'swasthya-setu-reschedule-source';

const BOOKINGS_QUERY_KEY = ['live-bookings'] as const;

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = (await response.json()) as { error?: string };
      message = data.error || message;
    } catch {
      // Ignore JSON parse errors here.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function useLiveBookings(childId?: string) {
  return useQuery({
    queryKey: [...BOOKINGS_QUERY_KEY, childId || 'all'],
    queryFn: () =>
      request<LiveBooking[]>(childId ? `/api/bookings?childId=${encodeURIComponent(childId)}` : '/api/bookings'),
    refetchInterval: 4000,
  });
}

export function useCreateLiveBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookingPayload) =>
      request<LiveBooking>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

export function useCancelLiveBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, remarks }: { id: string; reason?: string; remarks?: string }) =>
      request<{ success: boolean }>(`/api/bookings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason, remarks }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

export function useRescheduleLiveBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RescheduleBookingPayload }) =>
      request<LiveBooking>(`/api/bookings/${encodeURIComponent(id)}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

