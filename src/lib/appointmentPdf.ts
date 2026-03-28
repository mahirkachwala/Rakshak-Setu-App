import { jsPDF } from 'jspdf';
import type { LiveBooking } from '@/lib/bookingApi';

type PdfKind = 'appointment' | 'cancellation' | 'reschedule' | 'certificate';

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(0, 87, 163);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, pageWidth / 2, 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(subtitle, pageWidth / 2, 15.5, { align: 'center' });
}

function drawSectionTitle(doc: jsPDF, y: number, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(235, 240, 250);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 57, 107);
  doc.text(title, pageWidth / 2, y + 4.8, { align: 'center' });
  return y + 10;
}

function addRow(doc: jsPDF, label: string, value: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`${label}:`, 15, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(value || '-', 120);
  doc.text(lines, 70, y);
  return y + Math.max(lines.length * 6, 7);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value?: string) {
  return value || '-';
}

function baseDocument(booking: LiveBooking, kind: PdfKind, replacement?: LiveBooking) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - 30;
  const subtitle = 'Raksha Setu Immunization Programme';
  const titleMap: Record<PdfKind, string> = {
    appointment: 'Routine Immunization Appointment Slip',
    cancellation: 'Appointment Cancellation Slip',
    reschedule: 'Appointment Reschedule Slip',
    certificate: 'Vaccination Certificate',
  };

  drawHeader(doc, titleMap[kind], subtitle);
  let y = 28;

  if (kind === 'cancellation') {
    doc.setTextColor(190, 30, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CANCELLED', pageWidth / 2, y + 4, { align: 'center' });
    y += 14;
  }

  if (kind === 'reschedule') {
    doc.setTextColor(181, 104, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RESCHEDULED', pageWidth / 2, y + 4, { align: 'center' });
    y += 14;
  }

  if (kind === 'certificate') {
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CERTIFIED COMPLETED', pageWidth / 2, y + 4, { align: 'center' });
    y += 14;
  }

  y = drawSectionTitle(doc, y, 'BENEFICIARY DETAILS');
  y = addRow(doc, 'Beneficiary Name', booking.childName, y);
  y = addRow(doc, 'Parent / Guardian', booking.parentName, y);
  y = addRow(doc, 'Reference ID', booking.referenceId, y);
  y = addRow(doc, 'Vaccine', booking.vaccineName, y);
  y = addRow(doc, 'Date of Birth', formatDate(booking.childDob), y);

  y += 3;
  y = drawSectionTitle(doc, y, kind === 'certificate' ? 'CERTIFICATE DETAILS' : 'APPOINTMENT DETAILS');
  y = addRow(doc, 'Health Centre', booking.centerName, y);
  y = addRow(doc, 'Address', booking.centerAddress || '-', y);
  y = addRow(doc, 'Session Site', booking.sessionSite || booking.centerName, y);
  y = addRow(doc, 'Scheduled Date', formatDate(booking.date), y);
  y = addRow(doc, 'Scheduled Time', formatTime(booking.time), y);
  y = addRow(doc, 'Current Status', booking.status.replace(/_/g, ' ').toUpperCase(), y);

  if (kind === 'appointment') {
    y += 3;
    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(200, 150, 0);
    doc.roundedRect(15, y, contentWidth, 18, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(120, 80, 0);
    doc.text(`Secret Verification Code: ${booking.secretCode}`, pageWidth / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Show this code to the health worker at the vaccination site.', pageWidth / 2, y + 13, {
      align: 'center',
    });
    y += 24;
  }

  if (kind === 'cancellation') {
    y = addRow(doc, 'Cancellation Reason', booking.cancelReason || booking.doctorRemarks || 'Cancelled', y);
    y = addRow(doc, 'Cancelled On', formatDate(booking.cancelledAt || booking.updatedAt), y);
  }

  if (kind === 'reschedule') {
    y = addRow(doc, 'Previous Appointment ID', booking.appointmentId, y);
    y = addRow(doc, 'Remarks', booking.doctorRemarks || 'Appointment rescheduled', y);
    if (replacement) {
      y = addRow(doc, 'New Appointment ID', replacement.appointmentId, y);
      y = addRow(doc, 'New Date', formatDate(replacement.date), y);
      y = addRow(doc, 'New Time', formatTime(replacement.time), y);
      y = addRow(doc, 'New Centre', replacement.centerName, y);
    }
  }

  if (kind === 'certificate') {
    y = addRow(doc, 'Vaccinated On', formatDate(booking.completedAt || booking.vaccinatedAt || booking.date), y);
    y = addRow(doc, 'Batch Number', booking.batchNumber || '-', y);
    y = addRow(doc, 'Doctor / Staff', booking.administeredBy || 'Raksha Setu Medical Officer', y);
    y = addRow(doc, 'Doctor Remarks', booking.doctorRemarks || booking.notes || 'Vaccination completed successfully.', y);
  }

  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(220, 220, 220);
  doc.rect(15, y + 4, contentWidth, 16, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const note = {
    appointment:
      'Please arrive 15 minutes early and carry your child profile. All age-appropriate vaccines will be administered as per the national schedule.',
    cancellation:
      'This appointment has been cancelled. You can book a fresh appointment from Raksha Setu or visit your nearest centre.',
    reschedule:
      'This slip records that the earlier appointment has been rescheduled. Please use the updated appointment details for your next visit.',
    certificate:
      'This certificate confirms that the listed vaccine dose was administered successfully and recorded in the Raksha Setu immunization register.',
  }[kind];
  const noteLines = doc.splitTextToSize(note, contentWidth - 6);
  doc.text(noteLines, 18, y + 9);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('Computer-generated by Raksha Setu. For queries call 104.', pageWidth / 2, 287, {
    align: 'center',
  });

  return doc;
}

function savePdfDocument(doc: jsPDF, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    doc.save(filename);
    return;
  }

  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches
      || navigatorWithStandalone.standalone === true;
    const isIOS = /iPad|iPhone|iPod/i.test(window.navigator.userAgent);

    if (isStandalone || isIOS) {
      const popup = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.assign(blobUrl);
      }
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  } catch {
    doc.save(filename);
  }
}

export function downloadAppointmentSlip(booking: LiveBooking) {
  const doc = baseDocument(booking, 'appointment');
  savePdfDocument(doc, `Appointment_${booking.referenceId}.pdf`);
}

export function downloadCancellationSlip(booking: LiveBooking) {
  const doc = baseDocument(booking, 'cancellation');
  savePdfDocument(doc, `Cancellation_${booking.referenceId}.pdf`);
}

export function downloadRescheduleSlip(booking: LiveBooking, replacement?: LiveBooking) {
  const doc = baseDocument(booking, 'reschedule', replacement);
  savePdfDocument(doc, `Reschedule_${booking.referenceId}.pdf`);
}

export function downloadVaccinationCertificate(booking: LiveBooking) {
  const doc = baseDocument(booking, 'certificate');
  savePdfDocument(doc, `Vaccination_Certificate_${booking.referenceId}.pdf`);
}
