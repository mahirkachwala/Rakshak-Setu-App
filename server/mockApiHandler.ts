import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  cancelSharedBooking,
  createSharedBooking,
  getSharedBooking,
  listSharedBookings,
  rescheduleSharedBooking,
} from "../shared/appointmentWorkflow";
import {
  fetchHardwareMiddlewareInfo,
  getHardwareMiddlewareConfig,
  lookupHardwareContainerPin,
} from "../shared/hardwareMiddleware";
import { getDataFilePath } from "../shared/runtimeData";

type UserRow = {
  id: number;
  name: string;
  phone: string;
  language: string;
  notifications_enabled: boolean;
  created_at: string;
};

type ChildRow = {
  id: number;
  user_id: number;
  name: string;
  dob: string;
  gender: string;
  blood_group: string | null;
  created_at: string;
};

type VaccineRow = {
  id: number;
  name: string;
  age_weeks: number;
  age_label: string;
  is_mandatory: boolean;
  description: string;
  side_effects: string;
  diseases: string;
};

type VaccineRecordRow = {
  id: number;
  child_id: number;
  vaccine_id: number;
  vaccine_name: string;
  completed_date: string;
  center_name: string | null;
  notes: string | null;
  created_at: string;
};

type CenterRow = {
  id: number;
  name: string;
  address: string;
  type: string;
  is_free: boolean;
  cost: string | null;
  phone: string | null;
  vaccines_available: string;
  lat: number | null;
  lng: number | null;
  open_hours: string | null;
  pincode: string | null;
  distance: string;
};

type BookingRow = {
  id: number;
  child_id: number;
  child_name: string;
  vaccine_id: number;
  vaccine_name: string;
  center_id: number;
  center_name: string;
  date: string;
  time: string;
  status: string;
  appointment_id: string;
  created_at: string;
};

type ConversationRow = {
  id: number;
  title: string;
  created_at: string;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: string;
};

type Db = {
  users: UserRow[];
  children: ChildRow[];
  vaccines: VaccineRow[];
  vaccineRecords: VaccineRecordRow[];
  centers: CenterRow[];
  bookings: BookingRow[];
  conversations: ConversationRow[];
  messages: MessageRow[];
};

const tableFiles = {
  users: getDataFilePath("users.json"),
  children: getDataFilePath("children.json"),
  vaccines: getDataFilePath("vaccines.json"),
  vaccineRecords: getDataFilePath("vaccine_records.json"),
  centers: getDataFilePath("centers.json"),
  bookings: getDataFilePath("bookings.json"),
  conversations: getDataFilePath("conversations.json"),
  messages: getDataFilePath("messages.json"),
} as const;

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
const SARVAM_TTS_SPEAKER = process.env.SARVAM_TTS_SPEAKER || "Priya";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EDGE_TTS_MULTILINGUAL_FALLBACK = "en-US-EmmaMultilingualNeural";
const EDGE_TTS_VOICES: Record<string, string> = {
  "en-IN": "en-IN-NeerjaExpressiveNeural",
  "hi-IN": "hi-IN-SwaraNeural",
  "mr-IN": "mr-IN-AarohiNeural",
  "bn-IN": "bn-IN-TanishaaNeural",
  "ta-IN": "ta-IN-PallaviNeural",
  "te-IN": "te-IN-ShrutiNeural",
  "gu-IN": "gu-IN-DhwaniNeural",
  "kn-IN": "kn-IN-SapnaNeural",
  "ml-IN": "ml-IN-SobhanaNeural",
  "pa-IN": EDGE_TTS_MULTILINGUAL_FALLBACK,
  "as-IN": EDGE_TTS_MULTILINGUAL_FALLBACK,
  "or-IN": EDGE_TTS_MULTILINGUAL_FALLBACK,
  "od-IN": EDGE_TTS_MULTILINGUAL_FALLBACK,
};

function readJsonArray<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath: string, rows: unknown[]): void {
  writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
}

function getEdgeTtsVoice(languageCode: string | undefined): string {
  if (!languageCode) return EDGE_TTS_VOICES["en-IN"];
  return EDGE_TTS_VOICES[languageCode] ?? EDGE_TTS_VOICES[`${languageCode.slice(0, 2)}-IN`] ?? EDGE_TTS_MULTILINGUAL_FALLBACK;
}

async function synthesizeEdgeTts(text: string, languageCode: string | undefined): Promise<Buffer | null> {
  const trimmed = text.trim().slice(0, 1500);
  if (!trimmed) return null;

  const tempDir = mkdtempSync(path.join(tmpdir(), "swasthya-edge-tts-"));
  const outputPath = path.join(tempDir, "voice.mp3");
  const voice = getEdgeTtsVoice(languageCode);

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "python",
        [
          "-m",
          "edge_tts",
          "--text",
          trimmed,
          "--voice",
          voice,
          "--rate",
          "+0%",
          "--write-media",
          outputPath,
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      );

      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(stderr || `edge-tts exited with code ${code ?? "unknown"}`));
      });
    });

    if (!existsSync(outputPath)) return null;
    return readFileSync(outputPath);
  } catch {
    return null;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function readDb(): Db {
  return {
    users: readJsonArray<UserRow>(tableFiles.users),
    children: readJsonArray<ChildRow>(tableFiles.children),
    vaccines: readJsonArray<VaccineRow>(tableFiles.vaccines),
    vaccineRecords: readJsonArray<VaccineRecordRow>(tableFiles.vaccineRecords),
    centers: readJsonArray<CenterRow>(tableFiles.centers),
    bookings: readJsonArray<BookingRow>(tableFiles.bookings),
    conversations: readJsonArray<ConversationRow>(tableFiles.conversations),
    messages: readJsonArray<MessageRow>(tableFiles.messages),
  };
}

type NodeLikeRequest = {
  url?: string;
  method?: string;
  on: (event: string, handler: (chunk?: Buffer) => void) => void;
};

type NodeLikeResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => void;
  end: (body?: string | Buffer) => void;
};

function nextId(rows: Array<{ id: number }>): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function toUserProfile(user: UserRow | null | undefined) {
  if (!user) return null;
  return {
    id: String(user.id),
    name: user.name,
    phone: user.phone,
    language: user.language,
    notificationsEnabled: user.notifications_enabled,
    createdAt: user.created_at,
  };
}

function parseBody(req: { on: (event: string, handler: (chunk?: Buffer) => void) => void }): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      if (chunk) chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(
  res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
  data: unknown,
  statusCode = 200,
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function getValidCompletionRecord(
  child: ChildRow,
  vaccine: VaccineRow,
  scheduledDate: Date,
  records: VaccineRecordRow[],
  today: Date,
): VaccineRecordRow | null {
  const childDob = parseIsoDate(child.dob);
  if (!childDob) return null;

  const earliestAllowed = startOfDay(new Date(scheduledDate));
  earliestAllowed.setDate(
    earliestAllowed.getDate() - (vaccine.age_weeks === 0 ? 0 : 14),
  );

  return (
    [...records]
      .sort((left, right) => right.completed_date.localeCompare(left.completed_date))
      .find((record) => {
        const completedDate = parseIsoDate(record.completed_date);
        if (!completedDate) return false;
        if (completedDate < childDob || completedDate > today) return false;
        return completedDate >= earliestAllowed;
      }) ?? null
  );
}

function computeSchedule(child: ChildRow, db: Db) {
  const today = startOfDay(new Date());
  const recordsByVaccine = new Map<number, VaccineRecordRow[]>();
  db.vaccineRecords
    .filter((record) => record.child_id === child.id)
    .forEach((record) => {
      const grouped = recordsByVaccine.get(record.vaccine_id) ?? [];
      grouped.push(record);
      recordsByVaccine.set(record.vaccine_id, grouped);
    });

  const scheduled = db.vaccines.map((vaccine) => {
    const scheduledDate = new Date(`${child.dob}T00:00:00`);
    scheduledDate.setDate(scheduledDate.getDate() + vaccine.age_weeks * 7);
    const completed = getValidCompletionRecord(
      child,
      vaccine,
      scheduledDate,
      recordsByVaccine.get(vaccine.id) ?? [],
      today,
    );
    const diffDays = Math.floor((startOfDay(scheduledDate).getTime() - today.getTime()) / 86400000);

    let status = "upcoming";
    if (completed) status = "completed";
    else if (diffDays < 0) status = "missed";
    else if (diffDays === 0) status = "due_today";
    else if (diffDays <= 7) status = "due_this_week";

    return {
      id: `sv_${vaccine.id}`,
      vaccineId: String(vaccine.id),
      name: vaccine.name,
      scheduledDate: toIsoDate(scheduledDate),
      ageWeeks: vaccine.age_weeks,
      ageLabel: vaccine.age_label,
      status,
      isMandatory: vaccine.is_mandatory,
      completedDate: completed?.completed_date ?? null,
    };
  });

  return {
    dueToday: scheduled.filter((item) => item.status === "due_today"),
    dueThisWeek: scheduled.filter((item) => item.status === "due_this_week"),
    upcoming: scheduled.filter((item) => item.status === "upcoming"),
    missed: scheduled.filter((item) => item.status === "missed"),
    completed: scheduled.filter((item) => item.status === "completed"),
  };
}

function buildChildSummary(child: ChildRow, db: Db) {
  const schedule = computeSchedule(child, db);
  const status =
    schedule.missed.length > 0 ? "missed" : schedule.dueToday.length > 0 || schedule.dueThisWeek.length > 0 ? "due" : "safe";
  const next = [...schedule.dueToday, ...schedule.dueThisWeek, ...schedule.upcoming][0];

  return {
    id: String(child.id),
    name: child.name,
    dob: child.dob,
    gender: child.gender,
    bloodGroup: child.blood_group,
    completedVaccines: schedule.completed.length,
    totalVaccines: db.vaccines.length,
    status,
    nextVaccineDate: next?.scheduledDate ?? null,
    nextVaccineName: next?.name ?? null,
  };
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectIntent(message: string) {
  const text = message.toLowerCase();
  if (/book|appointment|slot/.test(text)) return "BOOK_APPOINTMENT";
  if (/center|centre|hospital|clinic|nearest|nearby|where/.test(text)) return "FIND_CENTER";
  if (/schedule|due|next vaccine|missed vaccine|which vaccine/.test(text)) return "VACCINE_SCHEDULE";
  if (/fever|temperature|bukhar|paracetamol|cold|cough/.test(text)) return "CHILD_FEVER";
  if (/emergency|ambulance|108|breathing|unconscious|seizure/.test(text)) return "EMERGENCY";
  return "GENERAL";
}

type AssistantIntent =
  | "BOOK_APPOINTMENT"
  | "FIND_CENTER"
  | "VACCINE_SCHEDULE"
  | "CHILD_FEVER"
  | "EMERGENCY"
  | "GENERAL";

type AssistantType = "info" | "warning" | "emergency" | "action" | "schedule";

type AssistantPayload = {
  intent: AssistantIntent;
  type: AssistantType;
  message: string;
  suggestions: string[];
};

function buildAssistantActionData(
  intent: AssistantIntent,
  body: { lat?: number; lng?: number },
  nearestCenters: CenterRow[],
  child: ChildRow | undefined,
  childSchedule: ReturnType<typeof computeSchedule> | null,
) {
  if (intent === "EMERGENCY") {
    return { phone: "108" };
  }

  if (intent === "BOOK_APPOINTMENT") {
    const center = nearestCenters[0];
    if (!center) return undefined;
    return {
      suggested_center: {
        id: String(center.id),
        name: center.name,
        address: center.address,
        distance:
          body.lat != null
          && body.lng != null
          && center.lat != null
          && center.lng != null
            ? formatDistance(haversine(body.lat, body.lng, center.lat, center.lng))
            : center.distance,
        type: center.type,
        cost: center.is_free ? "Free" : center.cost || "Paid",
        phone: center.phone,
        lat: center.lat,
        lng: center.lng,
      },
      available_slots: ["9:00 AM", "10:30 AM", "12:00 PM", "2:30 PM", "4:00 PM"],
      recommended_date: new Date(Date.now() + 86400000).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    };
  }

  if (intent === "FIND_CENTER") {
    return {
      centers: nearestCenters.map((center) => ({
        id: String(center.id),
        name: center.name,
        address: center.address,
        distance:
          body.lat != null
          && body.lng != null
          && center.lat != null
          && center.lng != null
            ? formatDistance(haversine(body.lat, body.lng, center.lat, center.lng))
            : center.distance,
        type: center.type,
        cost: center.is_free ? "Free" : center.cost || "Paid",
      })),
    };
  }

  if (intent === "VACCINE_SCHEDULE" && child && childSchedule) {
    const vaccines = [
      ...childSchedule.missed,
      ...childSchedule.dueToday,
      ...childSchedule.dueThisWeek,
      ...childSchedule.upcoming.slice(0, 3),
    ];
    return {
      vaccines: vaccines.map((vaccine) => ({
        name: vaccine.name,
        status: vaccine.status,
        scheduledDate: new Date(vaccine.scheduledDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        ageLabel: vaccine.ageLabel,
      })),
    };
  }

  return undefined;
}

function buildAssistantFallback(
  intent: AssistantIntent,
  _language: string,
  child: ChildRow | undefined,
): AssistantPayload {
  if (intent === "EMERGENCY") {
    return {
      intent,
      type: "emergency",
      message: "This sounds urgent. Please call 108 immediately or go to the nearest hospital.",
      suggestions: ["Call 108", "Nearest hospital", "What should I do now?"],
    };
  }

  if (intent === "CHILD_FEVER") {
    return {
      intent,
      type: "warning",
      message: `If ${child?.name || "your child"} has mild fever after vaccination, give fluids, keep the child comfortable, and see a doctor if the fever is high or lasts more than two days.`,
      suggestions: ["When should I see a doctor?", "Find nearest centre", "Show vaccine schedule"],
    };
  }

  if (intent === "BOOK_APPOINTMENT") {
    return {
      intent,
      type: "action",
      message: `I found a vaccination centre for ${child?.name || "your child"}. You can book from the app now.`,
      suggestions: ["Show due vaccines", "Find another centre", "Which documents are needed?"],
    };
  }

  if (intent === "FIND_CENTER") {
    return {
      intent,
      type: "action",
      message: "Here are the nearest vaccination centres.",
      suggestions: ["Book appointment", "Which centre is free?", "Open the map"],
    };
  }

  if (intent === "VACCINE_SCHEDULE") {
    return {
      intent,
      type: "schedule",
      message: `Here is the vaccine schedule for ${child?.name || "your child"}.`,
      suggestions: ["Book appointment", "Find nearest centre", "Show missed vaccines"],
    };
  }

  return {
    intent: "GENERAL",
    type: "info",
    message: "I can help with vaccines, child health questions, nearby centres, bookings, ABHA guidance, and app support.",
    suggestions: ["Show vaccine schedule", "Find nearest centre", "Book appointment"],
  };
}

function stripCodeFence(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function coerceAssistantIntent(value: string | undefined, fallback: AssistantIntent): AssistantIntent {
  const allowed: AssistantIntent[] = [
    "BOOK_APPOINTMENT",
    "FIND_CENTER",
    "VACCINE_SCHEDULE",
    "CHILD_FEVER",
    "EMERGENCY",
    "GENERAL",
  ];
  return allowed.includes(value as AssistantIntent) ? (value as AssistantIntent) : fallback;
}

function coerceAssistantType(value: string | undefined, fallback: AssistantType): AssistantType {
  const allowed: AssistantType[] = ["info", "warning", "emergency", "action", "schedule"];
  return allowed.includes(value as AssistantType) ? (value as AssistantType) : fallback;
}

async function generateGeminiAssistantReply(input: {
  rawMessage: string;
  appLanguage: string;
  child: ChildRow | undefined;
  childSchedule: ReturnType<typeof computeSchedule> | null;
  nearestCenters: CenterRow[];
  liveBookings: ReturnType<typeof listSharedBookings>;
  fallbackIntent: AssistantIntent;
}): Promise<AssistantPayload | null> {
  if (!GEMINI_API_KEY) return null;

  const scheduleSummary = input.childSchedule
    ? {
        dueToday: input.childSchedule.dueToday.map((vaccine) => vaccine.name),
        dueThisWeek: input.childSchedule.dueThisWeek.map((vaccine) => vaccine.name),
        missed: input.childSchedule.missed.map((vaccine) => vaccine.name),
        upcoming: input.childSchedule.upcoming.slice(0, 5).map((vaccine) => ({
          name: vaccine.name,
          date: vaccine.scheduledDate,
          ageLabel: vaccine.ageLabel,
        })),
        completedCount: input.childSchedule.completed.length,
      }
    : null;

  const bookingSummary = input.liveBookings.slice(0, 5).map((booking) => ({
    appointmentId: booking.appointmentId,
    vaccineName: booking.vaccineName,
    centerName: booking.centerName,
    date: booking.date,
    time: booking.time,
    status: booking.status,
  }));

  const centerSummary = input.nearestCenters.slice(0, 5).map((center) => ({
    id: String(center.id),
    name: center.name,
    address: center.address,
    type: center.type,
    cost: center.is_free ? "Free" : center.cost || "Paid",
    openHours: center.open_hours || "",
    pincode: center.pincode || "",
  }));

  const prompt = {
    role: "Swasthya Sewa",
    task: "Answer a parent or guardian using the same language and script as the latest user question unless the user explicitly asks for another language.",
    rules: [
      "Be warm, concise, and practical.",
      "You support child vaccination, ABHA health account, nearby centres, bookings, app usage, and general healthcare questions.",
      "If the question is medical, never claim to diagnose. Give safe general guidance and advise a doctor when needed.",
      "If the situation sounds severe or life-threatening, tell the user to call 108 immediately and go to the nearest hospital.",
      "Use app context only when it is provided below. Do not invent child names, dates, centres, or bookings.",
      "Return only strict JSON with keys intent, type, message, suggestions.",
      "Suggestions must be an array with 2 or 3 short follow-up prompts in the same language as the answer.",
      "intent must be one of BOOK_APPOINTMENT, FIND_CENTER, VACCINE_SCHEDULE, CHILD_FEVER, EMERGENCY, GENERAL.",
      "type must be one of info, warning, emergency, action, schedule.",
    ],
    appLanguage: input.appLanguage,
    selectedChild: input.child
      ? {
          name: input.child.name,
          dob: input.child.dob,
          gender: input.child.gender,
        }
      : null,
    vaccineSchedule: scheduleSummary,
    nearestCenters: centerSummary,
    liveBookings: bookingSummary,
    fallbackIntent: input.fallbackIntent,
    userQuestion: input.rawMessage,
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: JSON.stringify(prompt, null, 2) }],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) return null;

    const parsed = JSON.parse(stripCodeFence(text)) as Partial<AssistantPayload>;
    const fallback = buildAssistantFallback(input.fallbackIntent, input.appLanguage, input.child);

    return {
      intent: coerceAssistantIntent(parsed.intent, fallback.intent),
      type: coerceAssistantType(parsed.type, fallback.type),
      message: typeof parsed.message === "string" && parsed.message.trim() ? parsed.message.trim() : fallback.message,
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
        ? parsed.suggestions
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            .slice(0, 3)
        : fallback.suggestions,
    };
  } catch {
    return null;
  }
}

function persistAssistantMessages(userText: string, assistantText: string, db: Db): void {
  let conversations = db.conversations;
  let messages = db.messages;

  if (conversations.length === 0) {
    conversations = [
      {
        id: 1,
        title: "Local Assistant Session",
        created_at: new Date().toISOString(),
      },
    ];
    writeJsonArray(tableFiles.conversations, conversations);
  }

  const conversationId = conversations[0].id;
  const baseId = nextId(messages);
  messages = [
    ...messages,
    { id: baseId, conversation_id: conversationId, role: "user", content: userText, created_at: new Date().toISOString() },
    { id: baseId + 1, conversation_id: conversationId, role: "ai", content: assistantText, created_at: new Date().toISOString() },
  ];
  writeJsonArray(tableFiles.messages, messages);
}

export async function handleApiRequest(req: NodeLikeRequest, res: NodeLikeResponse): Promise<void> {
  const url = req.url ? new URL(req.url, "http://127.0.0.1") : null;
  const pathname = url?.pathname;
  if (!pathname?.startsWith("/api")) {
    return;
  }

  const method = (req.method ?? "GET").toUpperCase();
  const db = readDb();

        if (method === "POST" && pathname === "/api/voice/tts") {
          const body = (await parseBody(req)) as Partial<{
            text: string;
            languageCode: string;
            rate: number;
          }>;

          if (!body.text?.trim()) {
            sendJson(res, { error: "Text is required" }, 400);
            return;
          }

          const text = body.text.trim();
          const languageCode = body.languageCode || "en-IN";
          const rate = typeof body.rate === "number" && body.rate > 0 ? body.rate : 1;

          if (SARVAM_API_KEY) {
            try {
              const upstream = await fetch(SARVAM_TTS_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "api-subscription-key": SARVAM_API_KEY,
                },
                body: JSON.stringify({
                  text: text.slice(0, 2500),
                  target_language_code: languageCode,
                  speaker: SARVAM_TTS_SPEAKER,
                  model: SARVAM_TTS_MODEL,
                  pace: rate,
                }),
              });

              const raw = await upstream.text();
              if (upstream.ok) {
                const payload = JSON.parse(raw) as { audios?: string[] };
                const encodedAudio = payload.audios?.[0];
                if (encodedAudio) {
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "audio/wav");
                  res.setHeader("Cache-Control", "no-store");
                  res.end(Buffer.from(encodedAudio, "base64"));
                  return;
                }
              }
            } catch {
              // Fall through to the local edge-tts fallback below.
            }
          }

          const edgeAudio = await synthesizeEdgeTts(text, languageCode);
          if (edgeAudio) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Cache-Control", "no-store");
            res.end(edgeAudio);
            return;
          }

          sendJson(res, { error: "Voice synthesis is unavailable right now" }, 502);
          return;
        }

        if (method === "GET" && pathname === "/api/healthz") {
          sendJson(res, { status: "ok" });
          return;
        }

        if (method === "GET" && pathname === "/api/hardware/middleware/info") {
          try {
            sendJson(res, await fetchHardwareMiddlewareInfo());
          } catch (error) {
            const config = getHardwareMiddlewareConfig();
            sendJson(
              res,
              {
                error: error instanceof Error ? error.message : "Unable to reach hardware middleware",
                configuredBaseUrl: config.baseUrl || null,
                timeoutMs: config.timeoutMs,
              },
              config.baseUrl ? 502 : 503,
            );
          }
          return;
        }

        const hardwarePinMatch = pathname.match(/^\/api\/hardware\/middleware\/pins\/([^/]+)$/);
        if (method === "GET" && hardwarePinMatch) {
          try {
            sendJson(res, await lookupHardwareContainerPin(decodeURIComponent(hardwarePinMatch[1])));
          } catch (error) {
            const config = getHardwareMiddlewareConfig();
            sendJson(
              res,
              {
                error: error instanceof Error ? error.message : "Unable to reach hardware middleware",
                configuredBaseUrl: config.baseUrl || null,
                timeoutMs: config.timeoutMs,
                containerPin: decodeURIComponent(hardwarePinMatch[1]),
              },
              config.baseUrl ? 502 : 503,
            );
          }
          return;
        }

        if (method === "GET" && pathname === "/api/bookings") {
          const childId = url?.searchParams.get("childId") || undefined;
          sendJson(res, listSharedBookings(childId));
          return;
        }

        if (method === "POST" && pathname === "/api/bookings") {
          const body = (await parseBody(req)) as Partial<{
            childId: string;
            vaccineId: string;
            vaccineName: string;
            centerId: string;
            centerName: string;
            centerAddress: string;
            centerCity: string;
            sessionSite: string;
            date: string;
            time: string;
          }>;

          if (!body.childId || !body.centerId || !body.date || !body.time) {
            sendJson(res, { error: "childId, centerId, date, and time are required" }, 400);
            return;
          }

          try {
            const booking = createSharedBooking({
              childId: body.childId,
              vaccineId: body.vaccineId,
              vaccineName: body.vaccineName,
              centerId: body.centerId,
              centerName: body.centerName,
              centerAddress: body.centerAddress,
              centerCity: body.centerCity,
              sessionSite: body.sessionSite,
              date: body.date,
              time: body.time,
            });
            sendJson(res, booking, 201);
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : "Unable to create booking" }, 400);
          }
          return;
        }

        const bookingMatch = pathname.match(/^\/api\/bookings\/([^/]+)$/);
        if (bookingMatch) {
          const bookingId = decodeURIComponent(bookingMatch[1]);

          if (method === "GET") {
            const booking = getSharedBooking(bookingId);
            if (!booking) {
              sendJson(res, { error: "Booking not found" }, 404);
              return;
            }
            sendJson(res, booking);
            return;
          }

          if (method === "DELETE") {
            const body = (await parseBody(req)) as Partial<{ reason: string; remarks: string }>;
            try {
              cancelSharedBooking(bookingId, {
                reason: body.reason,
                remarks: body.remarks,
                actorName: "Parent / Guardian",
              });
              sendJson(res, { success: true });
            } catch (error) {
              sendJson(res, { error: error instanceof Error ? error.message : "Unable to cancel booking" }, 400);
            }
            return;
          }
        }

        const rescheduleBookingMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/reschedule$/);
        if (method === "POST" && rescheduleBookingMatch) {
          const bookingId = decodeURIComponent(rescheduleBookingMatch[1]);
          const body = (await parseBody(req)) as Partial<{
            newDate: string;
            newTime: string;
            newCenterId: string;
            newCenterName: string;
            newCenterAddress: string;
            newCenterCity: string;
            newSessionSite: string;
            remarks: string;
          }>;

          if (!body.newDate || !body.newTime) {
            sendJson(res, { error: "newDate and newTime are required" }, 400);
            return;
          }

          try {
            const result = rescheduleSharedBooking(bookingId, {
              newDate: body.newDate,
              newTime: body.newTime,
              newCenterId: body.newCenterId,
              newCenterName: body.newCenterName,
              newCenterAddress: body.newCenterAddress,
              newCenterCity: body.newCenterCity,
              newSessionSite: body.newSessionSite,
              remarks: body.remarks,
              actorName: "Parent / Guardian",
            });
            sendJson(res, result.replacement);
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : "Unable to reschedule booking" }, 400);
          }
          return;
        }

        if (method === "GET" && pathname === "/api/users/profile") {
          sendJson(res, toUserProfile(db.users[0]));
          return;
        }

        if (method === "GET" && pathname === "/api/vaccines") {
          sendJson(
            res,
            db.vaccines.map((vaccine) => ({
              id: String(vaccine.id),
              name: vaccine.name,
              ageWeeks: vaccine.age_weeks,
              ageLabel: vaccine.age_label,
              isMandatory: vaccine.is_mandatory,
            })),
          );
          return;
        }

        if (method === "PUT" && pathname === "/api/users/profile") {
          const body = (await parseBody(req)) as Partial<{
            name: string;
            phone: string;
            language: string;
            notificationsEnabled: boolean;
          }>;
          const users = db.users;
          const existing = users[0];
          const row: UserRow = existing
            ? {
                ...existing,
                name: body.name?.trim() || existing.name,
                phone: typeof body.phone === "string" ? body.phone.trim() : existing.phone,
                language: body.language?.trim() || existing.language,
                notifications_enabled:
                  typeof body.notificationsEnabled === "boolean"
                    ? body.notificationsEnabled
                    : existing.notifications_enabled,
              }
            : {
                id: 1,
                name: body.name?.trim() || "Parent",
                phone: typeof body.phone === "string" ? body.phone.trim() : "",
                language: body.language?.trim() || "en",
                notifications_enabled: body.notificationsEnabled ?? true,
                created_at: new Date().toISOString(),
              };

          if (existing) users[0] = row;
          else users.push(row);

          writeJsonArray(tableFiles.users, users);
          sendJson(res, toUserProfile(row));
          return;
        }

        if (method === "GET" && pathname === "/api/children") {
          sendJson(res, db.children.map((child) => buildChildSummary(child, db)));
          return;
        }

        if (method === "POST" && pathname === "/api/children") {
          const body = (await parseBody(req)) as Partial<ChildRow>;
          const children = db.children;
          const row: ChildRow = {
            id: nextId(children),
            user_id: 1,
            name: body.name?.trim() || `Child ${nextId(children)}`,
            dob: body.dob || toIsoDate(new Date()),
            gender: body.gender || "male",
            blood_group: body.blood_group ?? null,
            created_at: new Date().toISOString(),
          };
          children.push(row);
          writeJsonArray(tableFiles.children, children);
          const nextDb = readDb();
          sendJson(res, buildChildSummary(row, nextDb), 201);
          return;
        }

        const childMatch = pathname.match(/^\/api\/children\/(\d+)$/);
        if (childMatch) {
          const childId = Number(childMatch[1]);
          if (method === "GET") {
            const child = db.children.find((row) => row.id === childId);
            if (!child) {
              sendJson(res, { error: "Child not found" }, 404);
              return;
            }
            sendJson(res, buildChildSummary(child, db));
            return;
          }

          if (method === "DELETE") {
            writeJsonArray(tableFiles.children, db.children.filter((row) => row.id !== childId));
            writeJsonArray(tableFiles.vaccineRecords, db.vaccineRecords.filter((row) => row.child_id !== childId));
            writeJsonArray(tableFiles.bookings, db.bookings.filter((row) => row.child_id !== childId));
            sendJson(res, { success: true });
            return;
          }
        }

        const scheduleMatch = pathname.match(/^\/api\/children\/(\d+)\/vaccine-schedule$/);
        if (method === "GET" && scheduleMatch) {
          const child = db.children.find((row) => row.id === Number(scheduleMatch[1]));
          if (!child) {
            sendJson(res, { error: "Child not found" }, 404);
            return;
          }
          const schedule = computeSchedule(child, db);
          sendJson(res, {
            childId: String(child.id),
            childName: child.name,
            childDob: child.dob,
            completedCount: schedule.completed.length,
            totalCount: db.vaccines.length,
            ...schedule,
          });
          return;
        }

        const completeMatch = pathname.match(/^\/api\/children\/(\d+)\/vaccines\/(\d+)\/complete$/);
        if (method === "POST" && completeMatch) {
          const childId = Number(completeMatch[1]);
          const vaccineId = Number(completeMatch[2]);
          const body = (await parseBody(req)) as { completedDate?: string; centerName?: string; notes?: string };
          const vaccine = db.vaccines.find((row) => row.id === vaccineId);
          if (!vaccine) {
            sendJson(res, { error: "Vaccine not found" }, 404);
            return;
          }
          const existing = db.vaccineRecords.find((row) => row.child_id === childId && row.vaccine_id === vaccineId);
          if (existing) {
            sendJson(res, { id: String(existing.id), childId: String(existing.child_id), vaccineId: String(existing.vaccine_id), vaccineName: existing.vaccine_name, completedDate: existing.completed_date, centerName: existing.center_name, notes: existing.notes });
            return;
          }
          const records = db.vaccineRecords;
          const record: VaccineRecordRow = {
            id: nextId(records),
            child_id: childId,
            vaccine_id: vaccineId,
            vaccine_name: vaccine.name,
            completed_date: body.completedDate || toIsoDate(new Date()),
            center_name: body.centerName || null,
            notes: body.notes || null,
            created_at: new Date().toISOString(),
          };
          records.push(record);
          writeJsonArray(tableFiles.vaccineRecords, records);
          sendJson(res, { id: String(record.id), childId: String(record.child_id), vaccineId: String(record.vaccine_id), vaccineName: record.vaccine_name, completedDate: record.completed_date, centerName: record.center_name, notes: record.notes });
          return;
        }

        if (method === "GET" && pathname === "/api/dashboard/summary") {
          const children = db.children.map((child) => buildChildSummary(child, db));
          const missedCount = children.filter((child) => child.status === "missed").length;
          const upcomingCount = children.filter((child) => child.status === "due").length;
          sendJson(res, {
            totalChildren: children.length,
            children,
            todayAction:
              missedCount > 0
                ? `${missedCount} child profile(s) have missed vaccines. Please visit a health center soon.`
                : upcomingCount > 0
                  ? `${upcomingCount} child profile(s) have vaccines due soon. Please plan a visit this week.`
                  : "All vaccinations are up to date! Great job!",
            upcomingCount,
            missedCount,
          });
          return;
        }

        if (method === "POST" && pathname === "/api/assistant/query") {
          const body = (await parseBody(req)) as {
            message?: string;
            rawMessage?: string;
            childId?: string;
            lat?: number;
            lng?: number;
            language?: string;
          };
          if (!body.message?.trim()) {
            sendJson(res, { error: "Message is required" }, 400);
            return;
          }

          const child = db.children.find((row) => String(row.id) === body.childId) || db.children[0];
          const fallbackIntent = detectIntent(body.message) as AssistantIntent;
          const rawMessage = body.rawMessage?.trim() || body.message.trim();
          const nearestCenters = [...db.centers]
            .sort((a, b) => {
              if (body.lat == null || body.lng == null || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
              return haversine(body.lat, body.lng, a.lat, a.lng) - haversine(body.lat, body.lng, b.lat, b.lng);
            })
            .slice(0, 5);
          const childSchedule = child ? computeSchedule(child, db) : null;
          const liveBookings = child ? listSharedBookings(String(child.id)) : listSharedBookings();
          const geminiResponse = await generateGeminiAssistantReply({
            rawMessage,
            appLanguage: body.language || "en",
            child,
            childSchedule,
            nearestCenters,
            liveBookings,
            fallbackIntent,
          });
          const fallbackResponse = buildAssistantFallback(fallbackIntent, body.language || "en", child);
          const finalResponse = geminiResponse ?? fallbackResponse;
          const intent = finalResponse.intent;

          const response = {
            intent,
            message: finalResponse.message,
            type: finalResponse.type,
            action_data: buildAssistantActionData(intent, body, nearestCenters, child, childSchedule),
            suggestions: finalResponse.suggestions,
            language: body.language || "en",
          };

          persistAssistantMessages(rawMessage, String(response.message || ""), db);
          sendJson(res, response);
          return;
        }

        if (method === "GET" && pathname === "/api/centers") {
          sendJson(res, db.centers);
          return;
        }

  sendJson(res, { error: "Mock API route not found" }, 404);
}
