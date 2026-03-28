import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDataFilePath } from "./runtimeData.js";
const tableFiles = {
    users: getDataFilePath("users.json"),
    children: getDataFilePath("children.json"),
    vaccines: getDataFilePath("vaccines.json"),
    vaccineRecords: getDataFilePath("vaccine_records.json"),
    centers: getDataFilePath("centers.json"),
    bookings: getDataFilePath("bookings.json"),
    slots: getDataFilePath("slots.json"),
};
const portalUsers = [
    {
        id: "doctor-1",
        name: "Dr. Asha Sharma",
        email: "doctor@swasthyasetu.in",
        role: "doctor",
        centerId: "mum-hosp-1",
        centerName: "Grant Med.College & J.J. Hospital",
        password: "doctor123",
    },
    {
        id: "staff-1",
        name: "Anjali Verma",
        email: "staff@swasthyasetu.in",
        role: "staff",
        centerId: "mum-hosp-1",
        centerName: "Grant Med.College & J.J. Hospital",
        password: "staff123",
    },
    {
        id: "admin-1",
        name: "Rahul Kulkarni",
        email: "admin@swasthyasetu.in",
        role: "admin",
        password: "admin123",
    },
];
function ensureJsonFile(filePath, initialValue = []) {
    const parentDir = path.dirname(filePath);
    if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
    }
    if (!existsSync(filePath)) {
        writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf8");
    }
}
function readJsonArray(filePath) {
    ensureJsonFile(filePath);
    const raw = readFileSync(filePath, "utf8").trim();
    if (!raw)
        return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeJsonArray(filePath, rows) {
    ensureJsonFile(filePath);
    writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
}
function readDb() {
    return {
        users: readJsonArray(tableFiles.users),
        children: readJsonArray(tableFiles.children),
        vaccines: readJsonArray(tableFiles.vaccines),
        vaccineRecords: readJsonArray(tableFiles.vaccineRecords),
        centers: readJsonArray(tableFiles.centers),
        bookings: readJsonArray(tableFiles.bookings),
        slots: readJsonArray(tableFiles.slots),
    };
}
function nextNumericId(rows) {
    return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}
function nowIso() {
    return new Date().toISOString();
}
function toIsoDate(input) {
    if (typeof input === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(input))
            return input;
        const parsed = new Date(input);
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toISOString().slice(0, 10);
        return input.slice(0, 10);
    }
    return input.toISOString().slice(0, 10);
}
function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}
function normalizeString(value) {
    return value?.trim() || "";
}
function generateAppointmentId() {
    return `appt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function generateReferenceId() {
    return String(Math.floor(10000000000000 + Math.random() * 89999999999999));
}
function generateSecretCode(referenceId) {
    return referenceId.slice(-4);
}
function getPrimaryUser(db) {
    return db.users[0];
}
function findChild(db, childId) {
    return db.children.find((child) => String(child.id) === String(childId));
}
function findVaccine(db, vaccineId, vaccineName) {
    if (vaccineId) {
        const vaccine = db.vaccines.find((row) => String(row.id) === String(vaccineId));
        if (vaccine)
            return vaccine;
    }
    if (vaccineName) {
        return db.vaccines.find((row) => row.name.toLowerCase() === vaccineName.toLowerCase());
    }
    return db.vaccines[0];
}
function findCenter(db, centerId, centerName) {
    return (db.centers.find((center) => String(center.id) === String(centerId)) ||
        db.centers.find((center) => center.name.toLowerCase() === normalizeString(centerName).toLowerCase()));
}
function parseTimeRange(timeValue) {
    const normalized = timeValue
        .replace(/\u2013/g, "-")
        .replace(/\u2014/g, "-")
        .trim();
    if (normalized.includes("-")) {
        const [startTime, endTime] = normalized.split("-").map((part) => part.trim());
        return {
            startTime: startTime || normalized,
            endTime: endTime || startTime || normalized,
        };
    }
    return {
        startTime: normalized,
        endTime: normalized,
    };
}
function statusDocuments(status) {
    return {
        appointmentSlip: true,
        cancellationSlip: status === "cancelled",
        rescheduleSlip: status === "rescheduled",
        vaccinationCertificate: status === "completed",
        smsConfirmation: true,
    };
}
function toSharedBooking(row) {
    const status = (row.status || "booked");
    const appointmentId = row.appointment_id;
    const referenceId = row.reference_id || appointmentId;
    const createdAt = row.created_at;
    return {
        id: appointmentId,
        appointmentId,
        childId: String(row.child_id),
        childName: row.child_name,
        childDob: row.child_dob,
        childGender: row.child_gender,
        parentName: row.parent_name || "Parent / Guardian",
        parentPhone: row.parent_phone,
        vaccineId: String(row.vaccine_id),
        vaccineName: row.vaccine_name,
        centerId: String(row.center_id),
        centerName: row.center_name,
        centerAddress: row.center_address,
        centerCity: row.center_city,
        sessionSite: row.session_site,
        date: toIsoDate(row.date),
        time: row.time,
        status,
        createdAt,
        updatedAt: row.updated_at,
        bookedAt: createdAt,
        refId: referenceId,
        referenceId,
        secretCode: row.secret_code || generateSecretCode(referenceId),
        notes: row.notes,
        doctorRemarks: row.doctor_remarks,
        cancelReason: row.cancel_reason,
        batchNumber: row.batch_number,
        administeredBy: row.administered_by,
        checkedInAt: row.checked_in_at,
        vaccinatedAt: row.vaccinated_at,
        completedAt: row.completed_at,
        cancelledAt: row.cancelled_at,
        rescheduledAt: row.rescheduled_at,
        rescheduledToAppointmentId: row.rescheduled_to_appointment_id,
        rescheduledFromAppointmentId: row.rescheduled_from_appointment_id,
        documents: statusDocuments(status),
    };
}
function toAdminAppointment(row) {
    return {
        id: row.appointment_id,
        childName: row.child_name,
        parentName: row.parent_name || "Parent / Guardian",
        parentPhone: row.parent_phone,
        vaccine: row.vaccine_name,
        date: toIsoDate(row.date),
        time: row.time,
        centerName: row.center_name,
        centerId: String(row.center_id),
        status: (row.status || "booked"),
        secretCode: row.secret_code || generateSecretCode(row.reference_id || row.appointment_id),
        referenceId: row.reference_id || row.appointment_id,
        childId: String(row.child_id),
        childDob: row.child_dob,
        address: row.center_address,
        notes: row.notes || row.doctor_remarks,
        cancelReason: row.cancel_reason,
        checkinTime: row.checked_in_at,
        vaccinationTime: row.vaccinated_at,
        parentAppointmentId: row.rescheduled_from_appointment_id,
        doctorRemarks: row.doctor_remarks,
        batchNumber: row.batch_number,
        administeredBy: row.administered_by,
        sessionSite: row.session_site,
        centerAddress: row.center_address,
        centerCity: row.center_city,
        rescheduledAt: row.rescheduled_at,
        rescheduledToAppointmentId: row.rescheduled_to_appointment_id,
        completedAt: row.completed_at,
    };
}
function toVaccinationRecord(row) {
    if ("appointment_id" in row && "vaccine_name" in row && "child_name" in row) {
        return {
            id: row.appointment_id || `record-${row.id}`,
            childId: String(row.child_id),
            childName: row.child_name,
            vaccine: row.vaccine_name,
            date: toIsoDate(row.completed_at || row.vaccinated_at || row.created_at),
            centerId: String(row.center_id),
            centerName: row.center_name,
            administeredBy: row.administered_by,
            batchNumber: row.batch_number,
            notes: row.notes || row.doctor_remarks,
            appointmentId: row.appointment_id,
        };
    }
    return {
        id: String(row.id),
        childId: String(row.child_id),
        childName: "",
        vaccine: row.vaccine_name,
        date: toIsoDate(row.completed_date),
        centerId: "",
        centerName: row.center_name || "",
        administeredBy: row.administered_by || undefined,
        batchNumber: row.batch_number || undefined,
        notes: row.notes || undefined,
        appointmentId: row.appointment_id || undefined,
    };
}
function compareByCreatedDesc(a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
function compareByScheduleAsc(a, b) {
    const aValue = new Date(`${toIsoDate(a.date)}T00:00:00`).getTime();
    const bValue = new Date(`${toIsoDate(b.date)}T00:00:00`).getTime();
    if (aValue !== bValue)
        return aValue - bValue;
    return a.time.localeCompare(b.time);
}
function getBookingIndex(bookings, id) {
    return bookings.findIndex((booking) => booking.appointment_id === id || String(booking.id) === id);
}
function ensureSlotForBooking(slots, booking) {
    const { startTime, endTime } = parseTimeRange(booking.time);
    const slotIndex = slots.findIndex((slot) => slot.center_id === String(booking.center_id) &&
        slot.date === toIsoDate(booking.date) &&
        slot.start_time === startTime &&
        slot.end_time === endTime);
    if (slotIndex >= 0) {
        const updated = [...slots];
        updated[slotIndex] = {
            ...updated[slotIndex],
            booked: updated[slotIndex].booked + 1,
        };
        return updated;
    }
    return [
        ...slots,
        {
            id: `slot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            center_id: String(booking.center_id),
            center_name: booking.center_name,
            date: toIsoDate(booking.date),
            start_time: startTime,
            end_time: endTime,
            capacity: 30,
            booked: 1,
            created_at: nowIso(),
        },
    ];
}
function releaseSlotForBooking(slots, booking) {
    const { startTime, endTime } = parseTimeRange(booking.time);
    return slots.map((slot) => {
        if (slot.center_id !== String(booking.center_id) ||
            slot.date !== toIsoDate(booking.date) ||
            slot.start_time !== startTime ||
            slot.end_time !== endTime) {
            return slot;
        }
        return {
            ...slot,
            booked: Math.max(0, slot.booked - 1),
        };
    });
}
function writeBookings(bookings) {
    writeJsonArray(tableFiles.bookings, bookings);
}
function writeVaccinationRecords(records) {
    writeJsonArray(tableFiles.vaccineRecords, records);
}
function writeSlots(slots) {
    writeJsonArray(tableFiles.slots, slots);
}
function computeChildSchedule(child, db) {
    const today = startOfDay(new Date());
    const recordsByVaccine = new Map(db.vaccineRecords
        .filter((record) => record.child_id === child.id)
        .map((record) => [record.vaccine_id, record]));
    const completedCount = db.vaccines.filter((vaccine) => recordsByVaccine.has(vaccine.id)).length;
    const missedCount = db.vaccines.filter((vaccine) => {
        const scheduledDate = new Date(`${child.dob}T00:00:00`);
        scheduledDate.setDate(scheduledDate.getDate() + vaccine.age_weeks * 7);
        return !recordsByVaccine.has(vaccine.id) && startOfDay(scheduledDate).getTime() < today.getTime();
    }).length;
    return {
        totalCount: db.vaccines.length,
        completedCount,
        missedCount,
    };
}
function getLatestAppointmentForChild(bookings, childId) {
    return bookings
        .filter((booking) => booking.child_id === childId)
        .sort(compareByCreatedDesc)[0];
}
function upsertVaccinationRecord(db, booking) {
    const records = [...db.vaccineRecords];
    const existingIndex = records.findIndex((record) => record.appointment_id === booking.appointment_id);
    const payload = {
        id: existingIndex >= 0 ? records[existingIndex].id : nextNumericId(records.map((record) => ({ id: record.id }))),
        child_id: booking.child_id,
        vaccine_id: Number(booking.vaccine_id) || 0,
        vaccine_name: booking.vaccine_name,
        completed_date: toIsoDate(booking.completed_at || booking.vaccinated_at || booking.date),
        center_name: booking.center_name,
        notes: booking.notes || booking.doctor_remarks || null,
        created_at: booking.completed_at || booking.vaccinated_at || nowIso(),
        batch_number: booking.batch_number || null,
        administered_by: booking.administered_by || null,
        appointment_id: booking.appointment_id,
    };
    if (existingIndex >= 0) {
        records[existingIndex] = payload;
    }
    else {
        records.push(payload);
    }
    writeVaccinationRecords(records);
    return {
        ...db,
        vaccineRecords: records,
    };
}
function createBookingRow(db, input) {
    const child = findChild(db, input.childId);
    if (!child) {
        throw new Error("Child not found");
    }
    const vaccine = findVaccine(db, input.vaccineId, input.vaccineName);
    const user = getPrimaryUser(db);
    const center = findCenter(db, input.centerId, input.centerName);
    const now = nowIso();
    const appointmentId = generateAppointmentId();
    const referenceId = generateReferenceId();
    return {
        id: nextNumericId(db.bookings.map((row) => ({ id: row.id }))),
        child_id: child.id,
        child_name: child.name,
        vaccine_id: input.vaccineId ? Number(input.vaccineId) || input.vaccineId : vaccine?.id || 0,
        vaccine_name: input.vaccineName || vaccine?.name || "Routine Immunization",
        center_id: input.centerId,
        center_name: input.centerName || center?.name || "Vaccination Centre",
        date: toIsoDate(input.date),
        time: input.time,
        status: "booked",
        appointment_id: appointmentId,
        created_at: now,
        updated_at: now,
        parent_name: user?.name || "Parent / Guardian",
        parent_phone: user?.phone || "",
        center_address: input.centerAddress || center?.address || "",
        center_city: input.centerCity || "",
        session_site: input.sessionSite || input.centerName || center?.name || "",
        reference_id: referenceId,
        secret_code: generateSecretCode(referenceId),
        child_dob: child.dob,
        child_gender: child.gender,
        language: user?.language || "en",
    };
}
export function listSharedBookings(childId) {
    const db = readDb();
    return db.bookings
        .filter((booking) => !childId || String(booking.child_id) === String(childId))
        .sort(compareByCreatedDesc)
        .map(toSharedBooking);
}
export function getSharedBooking(id) {
    const db = readDb();
    const booking = db.bookings.find((row) => row.appointment_id === id || String(row.id) === id);
    return booking ? toSharedBooking(booking) : null;
}
export function createSharedBooking(input) {
    const db = readDb();
    const booking = createBookingRow(db, input);
    const bookings = [...db.bookings, booking];
    const slots = ensureSlotForBooking(db.slots, booking);
    writeBookings(bookings);
    writeSlots(slots);
    return toSharedBooking(booking);
}
export function cancelSharedBooking(id, input = {}) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const existing = bookings[bookingIndex];
    if (["completed", "cancelled", "rescheduled"].includes(existing.status)) {
        throw new Error(`Cannot cancel appointment with status '${existing.status}'.`);
    }
    const updated = {
        ...existing,
        status: "cancelled",
        cancel_reason: input.reason || existing.cancel_reason || "Cancelled by user",
        doctor_remarks: input.remarks || existing.doctor_remarks,
        cancelled_at: nowIso(),
        updated_at: nowIso(),
    };
    bookings[bookingIndex] = updated;
    writeBookings(bookings);
    writeSlots(releaseSlotForBooking(db.slots, existing));
    return toSharedBooking(updated);
}
export function rescheduleSharedBooking(id, input) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const existing = bookings[bookingIndex];
    if (!["booked", "pending", "checked_in"].includes(existing.status)) {
        throw new Error(`Cannot reschedule appointment with status '${existing.status}'.`);
    }
    const referenceId = generateReferenceId();
    const newAppointmentId = generateAppointmentId();
    const now = nowIso();
    const original = {
        ...existing,
        status: "rescheduled",
        doctor_remarks: input.remarks || existing.doctor_remarks,
        rescheduled_at: now,
        rescheduled_to_appointment_id: newAppointmentId,
        updated_at: now,
    };
    const replacement = {
        ...existing,
        id: nextNumericId(bookings.map((row) => ({ id: row.id }))),
        appointment_id: newAppointmentId,
        date: toIsoDate(input.newDate),
        time: input.newTime,
        status: "booked",
        created_at: now,
        updated_at: now,
        reference_id: referenceId,
        secret_code: generateSecretCode(referenceId),
        center_id: input.newCenterId || existing.center_id,
        center_name: input.newCenterName || existing.center_name,
        center_address: input.newCenterAddress || existing.center_address,
        center_city: input.newCenterCity || existing.center_city,
        session_site: input.newSessionSite || existing.session_site,
        rescheduled_from_appointment_id: existing.appointment_id,
        rescheduled_to_appointment_id: undefined,
        rescheduled_at: undefined,
        checked_in_at: undefined,
        vaccinated_at: undefined,
        completed_at: undefined,
        cancelled_at: undefined,
        cancel_reason: undefined,
        batch_number: undefined,
        notes: undefined,
    };
    bookings[bookingIndex] = original;
    bookings.push(replacement);
    writeBookings(bookings);
    let slots = releaseSlotForBooking(db.slots, existing);
    slots = ensureSlotForBooking(slots, replacement);
    writeSlots(slots);
    return {
        original: toSharedBooking(original),
        replacement: toSharedBooking(replacement),
    };
}
export function updateSharedBookingStatus(id, input) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const updated = {
        ...bookings[bookingIndex],
        status: input.status,
        notes: input.notes || bookings[bookingIndex].notes,
        doctor_remarks: input.notes || bookings[bookingIndex].doctor_remarks,
        updated_at: nowIso(),
    };
    bookings[bookingIndex] = updated;
    writeBookings(bookings);
    if (updated.status === "completed") {
        upsertVaccinationRecord(db, updated);
    }
    return toSharedBooking(updated);
}
export function checkInSharedBooking(id, actorName) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const current = bookings[bookingIndex];
    if (!["booked", "pending"].includes(current.status)) {
        throw new Error(`Cannot check in appointment with status '${current.status}'.`);
    }
    const updated = {
        ...current,
        status: "checked_in",
        checked_in_at: nowIso(),
        doctor_remarks: current.doctor_remarks || (actorName ? `Checked in by ${actorName}` : current.doctor_remarks),
        updated_at: nowIso(),
    };
    bookings[bookingIndex] = updated;
    writeBookings(bookings);
    return toSharedBooking(updated);
}
export function vaccinateSharedBooking(id, input = {}) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const current = bookings[bookingIndex];
    if (current.status !== "checked_in") {
        throw new Error(`Cannot vaccinate: patient must be checked in first (current: ${current.status}).`);
    }
    const updated = {
        ...current,
        status: "vaccinated",
        vaccinated_at: nowIso(),
        batch_number: input.batchNumber || current.batch_number,
        notes: input.notes || current.notes,
        doctor_remarks: input.notes || current.doctor_remarks,
        administered_by: input.actorName || current.administered_by,
        updated_at: nowIso(),
    };
    bookings[bookingIndex] = updated;
    writeBookings(bookings);
    upsertVaccinationRecord(db, updated);
    return toSharedBooking(updated);
}
export function completeSharedBooking(id, input = {}) {
    const db = readDb();
    const bookings = [...db.bookings];
    const bookingIndex = getBookingIndex(bookings, id);
    if (bookingIndex < 0) {
        throw new Error("Appointment not found");
    }
    const current = bookings[bookingIndex];
    if (current.status !== "vaccinated") {
        throw new Error(`Cannot complete: must be vaccinated first (current: ${current.status}).`);
    }
    const updated = {
        ...current,
        status: "completed",
        completed_at: nowIso(),
        notes: input.notes || current.notes,
        doctor_remarks: input.notes || current.doctor_remarks,
        administered_by: input.actorName || current.administered_by,
        updated_at: nowIso(),
    };
    bookings[bookingIndex] = updated;
    writeBookings(bookings);
    upsertVaccinationRecord(db, updated);
    return toSharedBooking(updated);
}
export function listAdminAppointments(filters = {}) {
    const db = readDb();
    const search = normalizeString(filters.search).toLowerCase();
    const vaccine = normalizeString(filters.vaccine).toLowerCase();
    const status = normalizeString(filters.status).toLowerCase();
    return db.bookings
        .filter((booking) => {
        if (filters.date && toIsoDate(booking.date) !== toIsoDate(filters.date))
            return false;
        if (status && booking.status.toLowerCase() !== status)
            return false;
        if (vaccine && !booking.vaccine_name.toLowerCase().includes(vaccine))
            return false;
        if (filters.centerId && String(booking.center_id) !== String(filters.centerId))
            return false;
        if (search &&
            ![
                booking.child_name,
                booking.parent_name || "",
                booking.parent_phone || "",
                booking.reference_id || booking.appointment_id,
            ]
                .join(" ")
                .toLowerCase()
                .includes(search)) {
            return false;
        }
        return true;
    })
        .sort(compareByScheduleAsc)
        .map(toAdminAppointment);
}
export function getAdminAppointment(id) {
    const db = readDb();
    const booking = db.bookings.find((row) => row.appointment_id === id || String(row.id) === id);
    return booking ? toAdminAppointment(booking) : null;
}
export function getDashboardStats(centerId) {
    const db = readDb();
    const today = toIsoDate(new Date());
    const appointments = listAdminAppointments({ centerId });
    const todays = appointments.filter((appointment) => appointment.date === today);
    return {
        totalToday: todays.length,
        completed: todays.filter((appointment) => appointment.status === "completed").length,
        pending: todays.filter((appointment) => ["booked", "pending", "checked_in", "vaccinated"].includes(appointment.status)).length,
        missed: todays.filter((appointment) => ["missed", "no_show", "cancelled"].includes(appointment.status)).length,
        totalPatients: db.children.length,
        upcomingAppointments: todays
            .filter((appointment) => ["booked", "pending", "checked_in", "vaccinated"].includes(appointment.status))
            .slice(0, 6),
    };
}
export function listAdminPatients(search) {
    const db = readDb();
    const query = normalizeString(search).toLowerCase();
    return db.children
        .filter((child) => {
        if (!query)
            return true;
        const latestBooking = getLatestAppointmentForChild(db.bookings, child.id);
        const parentName = latestBooking?.parent_name || getPrimaryUser(db)?.name || "";
        const parentPhone = latestBooking?.parent_phone || getPrimaryUser(db)?.phone || "";
        return `${child.name} ${parentName} ${parentPhone}`.toLowerCase().includes(query);
    })
        .map((child) => {
        const latestBooking = getLatestAppointmentForChild(db.bookings, child.id);
        const schedule = computeChildSchedule(child, db);
        return {
            id: String(child.id),
            name: child.name,
            dob: child.dob,
            gender: child.gender,
            parentName: latestBooking?.parent_name || getPrimaryUser(db)?.name || "Parent / Guardian",
            parentPhone: latestBooking?.parent_phone || getPrimaryUser(db)?.phone || "",
            address: latestBooking?.center_address || "",
            centerId: latestBooking ? String(latestBooking.center_id) : undefined,
            totalVaccines: schedule.totalCount,
            completedVaccines: schedule.completedCount,
            missedVaccines: schedule.missedCount,
        };
    });
}
export function getAdminPatientDetail(childId) {
    const db = readDb();
    const child = findChild(db, childId);
    if (!child)
        return null;
    const patient = listAdminPatients().find((row) => row.id === String(child.id));
    if (!patient)
        return null;
    const appointments = db.bookings
        .filter((booking) => booking.child_id === child.id)
        .sort(compareByScheduleAsc)
        .map(toAdminAppointment);
    const vaccinationHistory = db.vaccineRecords
        .filter((record) => record.child_id === child.id)
        .map((record) => {
        const booking = db.bookings.find((row) => row.appointment_id === record.appointment_id);
        if (booking)
            return toVaccinationRecord(booking);
        return {
            ...toVaccinationRecord(record),
            childName: child.name,
        };
    });
    return {
        child: patient,
        appointments,
        vaccinationHistory,
    };
}
function toCenterType(center) {
    const name = `${center.type} ${center.name}`.toLowerCase();
    if (name.includes("uphc"))
        return "UPHC";
    if (name.includes("chc"))
        return "CHC";
    if (name.includes("phc"))
        return "PHC";
    return "Hospital";
}
export function listAdminCenters() {
    const db = readDb();
    return db.centers.map((center) => ({
        id: String(center.id),
        name: center.name,
        address: center.address,
        type: toCenterType(center),
        timing: center.open_hours || undefined,
        services: normalizeString(center.vaccines_available)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
        phone: center.phone || undefined,
        district: center.pincode ? `Pincode ${center.pincode}` : "District",
        state: "India",
    }));
}
export function listAdminVaccinations(filters = {}) {
    const db = readDb();
    return db.bookings
        .filter((booking) => booking.status === "completed" || booking.status === "vaccinated")
        .filter((booking) => !filters.childId || String(booking.child_id) === String(filters.childId))
        .filter((booking) => !filters.centerId || String(booking.center_id) === String(filters.centerId))
        .sort(compareByCreatedDesc)
        .map(toVaccinationRecord);
}
export function listAdminSlots(filters = {}) {
    const db = readDb();
    return db.slots
        .filter((slot) => !filters.centerId || slot.center_id === String(filters.centerId))
        .filter((slot) => !filters.date || slot.date === toIsoDate(filters.date))
        .sort((a, b) => {
        if (a.date !== b.date)
            return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
    })
        .map((slot) => ({
        id: slot.id,
        centerId: slot.center_id,
        centerName: slot.center_name,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        capacity: slot.capacity,
        booked: slot.booked,
        available: Math.max(0, slot.capacity - slot.booked),
    }));
}
export function createAdminSlot(input) {
    const db = readDb();
    const center = findCenter(db, input.centerId);
    const slot = {
        id: `slot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        center_id: input.centerId,
        center_name: center?.name || "Primary Center",
        date: toIsoDate(input.date),
        start_time: input.startTime,
        end_time: input.endTime,
        capacity: Math.max(1, Number(input.capacity) || 1),
        booked: 0,
        created_at: nowIso(),
    };
    writeSlots([...db.slots, slot]);
    return {
        id: slot.id,
        centerId: slot.center_id,
        centerName: slot.center_name,
        date: slot.date,
        startTime: slot.start_time,
        endTime: slot.end_time,
        capacity: slot.capacity,
        booked: slot.booked,
        available: slot.capacity,
    };
}
export function deleteAdminSlot(id) {
    const db = readDb();
    writeSlots(db.slots.filter((slot) => slot.id !== id));
    return { success: true, message: "Slot removed successfully." };
}
export function loginPortalUser(email, password) {
    const user = portalUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password);
    if (!user)
        return null;
    return {
        token: `mock-${user.id}`,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            centerId: user.centerId,
            centerName: user.centerName,
        },
    };
}
export function resolvePortalUserFromAuthHeader(headerValue) {
    const token = normalizeString(headerValue).replace(/^Bearer\s+/i, "");
    if (!token)
        return null;
    return portalUsers.find((user) => `mock-${user.id}` === token) || null;
}
