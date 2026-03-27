import type { Language } from '@/store';

export interface BirthVaccineOption {
  id: string;
  name: string;
  ageWeeks: number;
  ageLabel: string;
  isMandatory: boolean;
}

type BirthVaccineCopy = {
  title: string;
  body: string;
  prompt: string;
  hint: string;
};

const COPY: Record<Language, BirthVaccineCopy> = {
  en: {
    title: 'Birth vaccines already given',
    body: 'This child was born earlier. Select the vaccines that were already given at birth.',
    prompt: 'Please select the vaccines already given at birth. You can say BCG, Hepatitis B, or OPV.',
    hint: 'Select all that apply. You can continue without selecting if none were given yet.',
  },
  hi: {
    title: 'जन्म के समय लगे टीके',
    body: 'यह बच्चा आज से पहले जन्मा है। जन्म के समय जो टीके लग चुके हैं उन्हें चुनें।',
    prompt: 'कृपया जन्म के समय लगे टीके चुनें। आप बीसीजी, हेपेटाइटिस बी, या ओपीवी बोल सकते हैं।',
    hint: 'जो भी लागू हो वह चुनें। अगर अभी कोई टीका नहीं लगा है तो बिना चुने आगे बढ़ सकते हैं।',
  },
  mr: {
    title: 'जन्मावेळी दिलेल्या लसी',
    body: 'हे मूल आजच्या आधी जन्मले आहे. जन्मावेळी आधीच दिलेल्या लसी निवडा.',
    prompt: 'कृपया जन्मावेळी दिलेल्या लसी निवडा. तुम्ही बीसीजी, हिपॅटायटिस बी किंवा ओपीव्ही बोलू शकता.',
    hint: 'लागू असलेल्या सर्व लसी निवडा. अजून लस दिली नसेल तर निवड न करता पुढे जाऊ शकता.',
  },
  bn: {
    title: 'জন্মের সময় দেওয়া টিকা',
    body: 'এই শিশুর জন্ম আজকের আগেই হয়েছে। জন্মের সময় যে টিকাগুলো দেওয়া হয়েছে সেগুলো বেছে নিন।',
    prompt: 'অনুগ্রহ করে জন্মের সময় দেওয়া টিকা বেছে নিন। আপনি বিসিজি, হেপাটাইটিস বি বা ওপিভি বলতে পারেন।',
    hint: 'যা যা প্রযোজ্য সব বেছে নিন। এখনও কিছু না দিয়ে থাকলে কিছু না বেছেও এগোতে পারেন।',
  },
  te: {
    title: 'పుట్టినప్పుడు ఇచ్చిన టీకాలు',
    body: 'ఈ బిడ్డ ఈరోజుకి ముందే పుట్టింది. పుట్టినప్పుడు ఇప్పటికే ఇచ్చిన టీకాలను ఎంచుకోండి.',
    prompt: 'దయచేసి పుట్టినప్పుడు ఇచ్చిన టీకాలను ఎంచుకోండి. మీరు బీసీజీ, హెపటైటిస్ బి లేదా ఓపీవీ అని చెప్పవచ్చు.',
    hint: 'వర్తించే అన్ని టీకాలను ఎంచుకోండి. ఇంకా ఏ టీకా వేయకపోతే ఎంచుకోకుండా ముందుకు వెళ్లవచ్చు.',
  },
  ta: {
    title: 'பிறக்கும் போது கொடுக்கப்பட்ட தடுப்பூசிகள்',
    body: 'இந்தக் குழந்தை இன்று முன்பே பிறந்தது. பிறக்கும் போது ஏற்கனவே கொடுக்கப்பட்ட தடுப்பூசிகளைத் தேர்வு செய்யுங்கள்.',
    prompt: 'பிறக்கும் போது கொடுக்கப்பட்ட தடுப்பூசிகளைத் தேர்வு செய்யுங்கள். பிசிஜி, ஹெபடிட்டிஸ் பி அல்லது ஓபிவி என்று சொல்லலாம்.',
    hint: 'பொருந்தும் அனைத்தையும் தேர்வு செய்யுங்கள். இன்னும் எதுவும் போடப்படவில்லை என்றால் தேர்வு செய்யாமல் தொடரலாம்.',
  },
  kn: {
    title: 'ಹುಟ್ಟುವಾಗ ನೀಡಿದ ಲಸಿಕೆಗಳು',
    body: 'ಈ ಮಗು ಇಂದಿಗಿಂತ ಮುಂಚೆ ಹುಟ್ಟಿದೆ. ಹುಟ್ಟುವಾಗ ಈಗಾಗಲೇ ನೀಡಿದ ಲಸಿಕೆಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    prompt: 'ದಯವಿಟ್ಟು ಹುಟ್ಟುವಾಗ ನೀಡಿದ ಲಸಿಕೆಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ. ನೀವು ಬಿಸಿಜಿ, ಹೆಪಟೈಟಿಸ್ ಬಿ ಅಥವಾ ಓಪಿವಿ ಎಂದು ಹೇಳಬಹುದು.',
    hint: 'ಅನ್ವಯಿಸುವ ಎಲ್ಲ ಲಸಿಕೆಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ. ಇನ್ನೂ ಲಸಿಕೆ ನೀಡದಿದ್ದರೆ ಯಾವುದನ್ನೂ ಆಯ್ಕೆ ಮಾಡದೆ ಮುಂದುವರಿಯಬಹುದು.',
  },
  gu: {
    title: 'જન્મ સમયે આપવામાં આવેલી રસી',
    body: 'આ બાળકનો જન્મ આજથી પહેલાં થયો છે. જન્મ સમયે પહેલેથી આપવામાં આવેલી રસી પસંદ કરો.',
    prompt: 'કૃપા કરીને જન્મ સમયે આપવામાં આવેલી રસી પસંદ કરો. તમે બીસીજી, હેપેટાઇટિસ બી અથવા ઓપીવી કહી શકો છો.',
    hint: 'જે લાગુ પડે તે બધી પસંદ કરો. જો હજુ કોઈ રસી ન અપાઈ હોય તો કંઈ પસંદ કર્યા વગર આગળ વધી શકો છો.',
  },
  ml: {
    title: 'ജനനസമయంలో നൽകിയ വാക്സിനുകൾ',
    body: 'ഈ കുഞ്ഞ് ഇന്നിനു മുമ്പ് ജനിച്ചതാണ്. ജനനസമయంలో ഇതിനകം നൽകിയ വാക്സിനുകൾ തിരഞ്ഞെടുക്കുക.',
    prompt: 'ദയവായി ജനനസമయంలో നൽകിയ വാക്സിനുകൾ തിരഞ്ഞെടുക്കുക. ബി സി ജി, ഹെപറ്റൈറ്റിസ് ബി, അല്ലെങ്കിൽ ഒ പി വി എന്ന് പറയാം.',
    hint: 'പ്രയോഗിക്കുന്ന എല്ലാം തിരഞ്ഞെടുക്കുക. ഇനിയും ഒന്നും നൽകിയിട്ടില്ലെങ്കിൽ ഒന്നും തിരഞ്ഞെടുക്കാതെ തുടരുമാം.',
  },
  pa: {
    title: 'ਜਨਮ ਵੇਲੇ ਲੱਗੇ ਟੀਕੇ',
    body: 'ਇਹ ਬੱਚਾ ਅੱਜ ਤੋਂ ਪਹਿਲਾਂ ਜਨਮਿਆ ਹੈ। ਜਨਮ ਵੇਲੇ ਲੱਗ ਚੁੱਕੇ ਟੀਕੇ ਚੁਣੋ।',
    prompt: 'ਕਿਰਪਾ ਕਰਕੇ ਜਨਮ ਵੇਲੇ ਲੱਗੇ ਟੀਕੇ ਚੁਣੋ। ਤੁਸੀਂ ਬੀਸੀਜੀ, ਹੈਪਾਟਾਈਟਿਸ ਬੀ ਜਾਂ ਓਪੀਵੀ ਕਹਿ ਸਕਦੇ ਹੋ।',
    hint: 'ਜੋ ਵੀ ਲਾਗੂ ਹੁੰਦੇ ਹਨ ਉਹ ਚੁਣੋ। ਜੇ ਅਜੇ ਕੋਈ ਟੀਕਾ ਨਹੀਂ ਲੱਗਿਆ ਤਾਂ ਬਿਨਾਂ ਚੁਣੇ ਅੱਗੇ ਵੱਧ ਸਕਦੇ ਹੋ।',
  },
  or: {
    title: 'ଜନ୍ମ ସମୟରେ ଦିଆଯାଇଥିବା ଟୀକା',
    body: 'ଏହି ଶିଶୁ ଆଜିର ପୂର୍ବରୁ ଜନ୍ମ ନେଇଛି। ଜନ୍ମ ସମୟରେ ଯେଉଁ ଟୀକା ଦିଆଯାଇଛି ସେଗୁଡିକ ବାଛନ୍ତୁ।',
    prompt: 'ଦୟାକରି ଜନ୍ମ ସମୟରେ ଦିଆଯାଇଥିବା ଟୀକା ବାଛନ୍ତୁ। ଆପଣ ବିସିଜି, ହେପାଟାଇଟିସ ବି କିମ୍ବା ଓପିଭି କହିପାରିବେ।',
    hint: 'ଯାହା ଲାଗୁହୁଏ ସେସବୁ ବାଛନ୍ତୁ। ଯଦି ଏଯାବତ୍ କୌଣସି ଟୀକା ଦିଆଯାଇନାହିଁ ତେବେ ବାଛିବା ଛାଡ଼ି ଆଗକୁ ବଢ଼ନ୍ତୁ।',
  },
  as: {
    title: 'জন্মৰ সময়ত দিয়া টিকা',
    body: 'এই শিশুটো আজিৰ আগতেই জন্ম হৈছে। জন্মৰ সময়ত ইতিমধ্যে দিয়া টিকাবোৰ বাছনি কৰক।',
    prompt: 'অনুগ্ৰহ কৰি জন্মৰ সময়ত দিয়া টিকাবোৰ বাছনি কৰক। আপুনি বিসিজি, হেপাটাইটিছ বি বা ওপিভি বুলি ক’ব পাৰে।',
    hint: 'যি যি প্ৰযোজ্য সেয়া বাছনি কৰক। এতিয়াও কিবা দিয়া হোৱা নাই যদি একো নিছিলেও আগবাঢ়িব পাৰে।',
  },
};

const CONTINUE_PATTERN = /continue|next|done|skip|go ahead|move on|आगे|अगला|हो गया|पुढे|পরে|আগে|తర్వాత|ಮುಂದೆ|પછી|ಮುಂದಕ್ಕೆ|തുടരാം|ਅੱਗੇ|ଆଗକୁ|আগবাঢ়/iu;
const NONE_PATTERN = /none|not given|not yet|no vaccine|skip all|कोई नहीं|अभी नहीं|नहीं लगा|काही नाही|এখনও না|কিছুই না|ఇంకా లేదు|ஒன்றும் இல்லை|ಯಾವುದೂ ಇಲ್ಲ|કંઈ નથી|ഒന്നുമില്ല|ਕੋਈ ਨਹੀਂ|କିଛି ନାହିଁ|একো নাই/iu;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()[\],.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAliases(option: BirthVaccineOption): string[] {
  const normalizedName = normalize(option.name);
  const aliases = [normalizedName];

  if (normalizedName.includes('bcg')) {
    aliases.push('bcg', 'b c g');
  }
  if (normalizedName.includes('hepatitis b')) {
    aliases.push('hepatitis b', 'hep b', 'hepb', 'hepatitis');
  }
  if (normalizedName.includes('opv')) {
    aliases.push('opv', 'o p v', 'polio', 'oral polio');
  }

  return aliases;
}

export function getBirthVaccineCopy(language: Language): BirthVaccineCopy {
  return COPY[language] ?? COPY.en;
}

export function isDobBeforeToday(dob: string): boolean {
  if (!dob) return false;
  const selected = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected.getTime() < today.getTime();
}

export async function fetchBirthVaccineOptions(): Promise<BirthVaccineOption[]> {
  const response = await fetch('/api/vaccines', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load vaccine options');
  }

  const data = (await response.json()) as BirthVaccineOption[];
  return data.filter((vaccine) => vaccine.ageWeeks === 0);
}

export async function completeBirthVaccines(
  childId: string,
  vaccineIds: string[],
  completedDate: string,
): Promise<void> {
  await Promise.all(
    vaccineIds.map(async (vaccineId) => {
      const response = await fetch(`/api/children/${childId}/vaccines/${vaccineId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedDate,
          notes: 'Marked during onboarding as given at birth',
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to save birth vaccine selection');
      }
    }),
  );
}

export function parseBirthVaccineSpeech(
  transcript: string,
  options: BirthVaccineOption[],
): { selectedIds: string[]; advance: boolean; clear: boolean } | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  const clear = NONE_PATTERN.test(normalized);
  const matched = options
    .filter((option) => getAliases(option).some((alias) => normalized.includes(alias)))
    .map((option) => option.id);

  if (!clear && matched.length === 0 && !CONTINUE_PATTERN.test(normalized)) {
    return null;
  }

  return {
    selectedIds: clear ? [] : matched,
    clear,
    advance: clear || matched.length > 0 || CONTINUE_PATTERN.test(normalized),
  };
}
