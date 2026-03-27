import type { Language } from '@/store';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const VOICE_INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;
const voiceInteractionWaiters = new Set<(ready: boolean) => void>();
let voiceInteractionTracked = false;
let voiceInteractionListenersAttached = false;
let activeRecognition: SpeechRecognitionLike | null = null;
let activeSpeechAudio: HTMLAudioElement | null = null;

const BROWSER_LANGUAGE_CODES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ml: 'ml-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  or: 'or-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  as: 'as-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
};

const SARVAM_LANGUAGE_CODES: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ml: 'ml-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  or: 'od-IN',
  pa: 'pa-IN',
  bn: 'bn-IN',
  as: 'as-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
};

const INDIC_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  '୦': '0', '୧': '1', '୨': '2', '୩': '3', '୪': '4',
  '୫': '5', '୬': '6', '୭': '7', '୮': '8', '୯': '9',
  '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4',
  '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9',
  '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4',
  '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9',
  '൦': '0', '൧': '1', '൨': '2', '൩': '3', '൪': '4',
  '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9',
  '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4',
  '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9',
  '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4',
  '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9',
};

const MONTH_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const FEMALE_WORDS = [
  'female', 'girl', 'daughter', 'woman', 'ladki', 'beti', 'stri',
  'लड़की', 'लडकी', 'बेटी', 'महिला',
  'मुलगी', 'मुलगीच',
  'মেয়ে', 'মহিলা',
  'ఆడ', 'అమ్మాయి',
  'பெண்', 'பெண்ணு',
  'ಹೆಣ್ಣು', 'ಮಗಳು',
  'സ്ത്രീ', 'പെൺ',
  'છોકરી', 'દીકરી',
  'ଝିଅ', 'ମହିଳା',
  'ਕੁੜੀ', 'ਧੀ',
  'ছোৱালী',
];

const MALE_WORDS = [
  'male', 'boy', 'son', 'man', 'ladka', 'beta', 'purush',
  'लड़का', 'लडका', 'बेटा', 'पुरुष',
  'मुलगा',
  'ছেলে', 'পুত্র',
  'మగ', 'అబ్బాయి',
  'ஆண்', 'பையன்',
  'ಗಂಡು', 'ಮಗ',
  'ആൺ', 'മകൻ',
  'છોકરો', 'દીકરો',
  'ପୁଅ', 'ପୁରୁଷ',
  'ਮੁੰਡਾ', 'ਪੁੱਤਰ',
  'লৰা',
];

const OTHER_WORDS = [
  'other', 'others', 'transgender',
  'अन्य', 'दूसरा', 'इतर',
  'অন্যান্য',
  'ఇతర',
  'மற்றவை',
  'ಇತರೆ',
  'മറ്റ്',
  'અન્ય',
  'ଅନ୍ୟ',
  'ਹੋਰ',
  'অন্যান্য',
];

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }).SpeechRecognition
    ?? (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
  return candidate ?? null;
}

function hasVoiceInteraction(): boolean {
  if (typeof navigator === 'undefined') return voiceInteractionTracked;
  const userActivation = (navigator as Navigator & {
    userActivation?: { hasBeenActive?: boolean };
  }).userActivation;
  return voiceInteractionTracked || Boolean(userActivation?.hasBeenActive);
}

function markVoiceInteraction(): void {
  voiceInteractionTracked = true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // Ignore resume failures and rely on the next playback attempt.
    }
  }

  for (const waiter of Array.from(voiceInteractionWaiters)) {
    waiter(true);
  }
  voiceInteractionWaiters.clear();
}

function ensureVoiceInteractionTracking(): void {
  if (typeof window === 'undefined' || voiceInteractionTracked || voiceInteractionListenersAttached) return;
  voiceInteractionListenersAttached = true;

  const handler = () => {
    markVoiceInteraction();
    voiceInteractionListenersAttached = false;
    for (const eventName of VOICE_INTERACTION_EVENTS) {
      window.removeEventListener(eventName, handler, true);
    }
  };

  for (const eventName of VOICE_INTERACTION_EVENTS) {
    window.addEventListener(eventName, handler, { capture: true, passive: true });
  }
}

export function initializeVoiceInteractionTracking(): void {
  ensureVoiceInteractionTracking();
}

function toIsoDateValue(year: number, monthIndex: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return null;
  const date = new Date(year, monthIndex, day);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== monthIndex
    || date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function getBrowserSpeechLanguage(language: Language): string {
  return BROWSER_LANGUAGE_CODES[language] ?? 'en-IN';
}

export function getSarvamLanguage(language: Language): string {
  return SARVAM_LANGUAGE_CODES[language] ?? 'en-IN';
}

export function stopSpeechPlayback(): void {
  if (activeSpeechAudio) {
    try {
      activeSpeechAudio.pause();
      activeSpeechAudio.currentTime = 0;
    } catch {
      // Ignore audio stop failures and continue cancelling browser speech.
    } finally {
      activeSpeechAudio = null;
    }
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

export function registerSpeechAudio(audio: HTMLAudioElement): void {
  if (activeSpeechAudio && activeSpeechAudio !== audio) {
    try {
      activeSpeechAudio.pause();
      activeSpeechAudio.currentTime = 0;
    } catch {
      // Ignore stale audio cleanup failures.
    }
  }

  activeSpeechAudio = audio;
}

export function unregisterSpeechAudio(audio: HTMLAudioElement): void {
  if (activeSpeechAudio === audio) {
    activeSpeechAudio = null;
  }
}

export function stopSpeechRecognition(): void {
  if (!activeRecognition) return;
  try {
    activeRecognition.abort?.();
  } catch {
    try {
      activeRecognition.stop();
    } catch {
      // Ignore stop failures and let the browser settle naturally.
    }
  } finally {
    activeRecognition = null;
  }
}

function stripSpeechText(text: string): string {
  return text
    .replace(/[*_~`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

async function getVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return existing;

  return new Promise((resolve) => {
    const handleVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        resolve(voices);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
      resolve(window.speechSynthesis.getVoices());
    }, 600);
  });
}

export async function waitForVoiceInteraction(timeoutMs = 8000): Promise<boolean> {
  if (hasVoiceInteraction()) return true;
  if (typeof window === 'undefined') return false;

  ensureVoiceInteractionTracking();

  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      voiceInteractionWaiters.delete(finish);
      resolve(false);
    }, timeoutMs);

    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      voiceInteractionWaiters.delete(finish);
      resolve(ready);
    };

    voiceInteractionWaiters.add(finish);
  });
}

export async function speakWithBrowser(text: string, language: Language, rate = 0.95): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  ensureVoiceInteractionTracking();
  const clean = stripSpeechText(text);
  if (!clean) return false;

  const langCode = getBrowserSpeechLanguage(language);
  const voices = await getVoices();
  const utterance = new SpeechSynthesisUtterance(clean);
  const prefix = langCode.split('-')[0];
  utterance.lang = langCode;
  utterance.rate = rate;
  utterance.pitch = 1.02;
  utterance.volume = 1;
  utterance.voice =
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix.toLowerCase()))
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
    ?? null;

  return new Promise((resolve) => {
    let started = false;
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(started), 4500);
    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {
      finish(false);
    }
  });
}

export async function fetchSarvamAudio(text: string, language: Language, rate = 1): Promise<Blob | null> {
  const clean = stripSpeechText(text);
  if (!clean) return null;

  try {
    const response = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: clean,
        languageCode: getSarvamLanguage(language),
        rate,
      }),
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('Content-Type') ?? '';
    if (!contentType.startsWith('audio/')) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export function captureSpeechWithBrowser(language: Language): Promise<string> {
  const Recognition = getSpeechRecognitionCtor();
  if (!Recognition) {
    return Promise.reject(new Error('Speech recognition is not available in this browser.'));
  }

  return new Promise((resolve, reject) => {
    stopSpeechRecognition();
    const recognition = new Recognition();
    let settled = false;
    activeRecognition = recognition;
    recognition.lang = getBrowserSpeechLanguage(language);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      settled = true;
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
      const transcript = event.results?.[0]?.[0]?.transcript?.trim?.() ?? '';
      resolve(transcript);
    };
    recognition.onerror = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
      if (!settled) {
        settled = true;
        reject(new Error('Speech recognition failed.'));
      }
    };
    recognition.onend = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
      if (!settled) {
        settled = true;
        reject(new Error('Speech recognition ended without a transcript.'));
      }
    };
    recognition.start();
  });
}

export function normalizeIndicDigits(value: string): string {
  return Array.from(value).map((char) => INDIC_DIGITS[char] ?? char).join('');
}

export function extractNumericSpeech(value: string, maxLength?: number): string {
  const digits = normalizeIndicDigits(value).replace(/\D/g, '');
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
}

export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseSpokenDate(value: string): string | null {
  const normalized = normalizeIndicDigits(value.toLowerCase())
    .replace(/[,]/g, ' ')
    .replace(/[.]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  const monthMatch = Object.entries(MONTH_INDEX).find(([month]) => normalized.includes(month));
  const parts = normalized.match(/\d+/g) ?? [];

  if (monthMatch && parts.length >= 2) {
    const [month, monthIndex] = monthMatch;
    const withoutMonth = normalized.replace(month, ' ').replace(/\s+/g, ' ').trim();
    const monthParts = withoutMonth.match(/\d+/g) ?? [];
    const day = Number(monthParts[0]);
    const year = Number(monthParts[1] ?? monthParts[0]);
    if (monthParts.length >= 2) {
      return toIsoDateValue(year, monthIndex, day);
    }
  }

  if (parts.length >= 3) {
    const [first, second, third] = parts;
    if (first.length === 4) {
      return toIsoDateValue(Number(first), Number(second) - 1, Number(third));
    }

    if (third.length === 4) {
      return toIsoDateValue(Number(third), Number(second) - 1, Number(first));
    }
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function matchGenderFromSpeech(value: string): 'male' | 'female' | 'other' | null {
  const normalized = normalizeIndicDigits(value.toLowerCase()).trim();
  if (!normalized) return null;

  if (FEMALE_WORDS.some((word) => normalized.includes(word))) return 'female';
  if (MALE_WORDS.some((word) => normalized.includes(word))) return 'male';
  if (OTHER_WORDS.some((word) => normalized.includes(word))) return 'other';
  return null;
}
