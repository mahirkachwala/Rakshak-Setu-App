import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Baby,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardSummaryQueryKey,
  getGetVaccineScheduleQueryKey,
  getGetUserProfileQueryKey,
  getListChildrenQueryKey,
  useCreateChild,
  useUpdateUserProfile,
} from '@workspace/api-client-react';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import {
  completeBirthVaccines,
  fetchBirthVaccineOptions,
  getBirthVaccineCopy,
  isDobBeforeToday,
  parseBirthVaccineSpeech,
  type BirthVaccineOption,
} from '@/lib/birthVaccines';
import { LANGUAGE_NAMES, useTranslation } from '@/lib/i18n';
import { getOnboardingCopy } from '@/lib/onboardingCopy';
import { getVoicePrompt } from '@/lib/voicePrompts';
import { matchGenderFromSpeech, parseSpokenDate, toTitleCase } from '@/lib/voice';
import { useAppStore } from '@/store';
import type { Language } from '@/store';

type SetupField = 'parent' | 'child' | 'dob' | 'birthVaccines' | 'gender' | 'permissions';

const LANGS: Array<{ code: Language; accent: string }> = [
  { code: 'en', accent: 'from-sky-500 to-blue-600' },
  { code: 'hi', accent: 'from-orange-500 to-amber-500' },
  { code: 'mr', accent: 'from-fuchsia-500 to-pink-500' },
  { code: 'bn', accent: 'from-emerald-500 to-green-600' },
  { code: 'te', accent: 'from-indigo-500 to-violet-600' },
  { code: 'ta', accent: 'from-rose-500 to-orange-500' },
  { code: 'kn', accent: 'from-cyan-500 to-sky-600' },
  { code: 'gu', accent: 'from-amber-500 to-orange-600' },
  { code: 'ml', accent: 'from-teal-500 to-emerald-600' },
  { code: 'pa', accent: 'from-purple-500 to-fuchsia-600' },
  { code: 'or', accent: 'from-lime-500 to-green-600' },
  { code: 'as', accent: 'from-blue-500 to-indigo-600' },
];

const SLIDE_THEMES = [
  { bg: 'from-sky-600 to-blue-700', icon: ShieldCheck },
  { bg: 'from-violet-600 to-indigo-700', icon: CalendarClock },
  { bg: 'from-emerald-600 to-green-700', icon: MapPin },
];

const GENDER_VALUES = ['male', 'female', 'other'] as const;

const FIELD_ERRORS: Record<Language, { date: string; gender: string }> = {
  en: {
    date: 'I could not understand the date. Please use the calendar.',
    gender: 'I could not understand the gender. Please tap an option.',
  },
  hi: {
    date: 'तारीख़ समझ नहीं आई। कृपया कैलेंडर चुनें।',
    gender: 'लिंग समझ नहीं आया। कृपया एक विकल्प चुनें।',
  },
  mr: {
    date: 'तारीख समजली नाही. कृपया कॅलेंडर वापरा.',
    gender: 'लिंग समजले नाही. कृपया पर्याय निवडा.',
  },
  bn: {
    date: 'তারিখ বুঝতে পারিনি। অনুগ্রহ করে ক্যালেন্ডার ব্যবহার করুন।',
    gender: 'লিঙ্গ বুঝতে পারিনি। অনুগ্রহ করে একটি বিকল্প বেছে নিন।',
  },
  te: {
    date: 'తేదీ అర్థం కాలేదు. దయచేసి క్యాలెండర్ ఉపయోగించండి.',
    gender: 'లింగం అర్థం కాలేదు. దయచేసి ఒక ఎంపికను ఎంచుకోండి.',
  },
  ta: {
    date: 'தேதி புரியவில்லை. தயவுசெய்து நாட்காட்டியை பயன்படுத்துங்கள்.',
    gender: 'பாலினம் புரியவில்லை. தயவுசெய்து ஒரு தேர்வைத் தேர்ந்தெடுக்கவும்.',
  },
  kn: {
    date: 'ದಿನಾಂಕ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಕ್ಯಾಲೆಂಡರ್ ಬಳಸಿ.',
    gender: 'ಲಿಂಗ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ.',
  },
  gu: {
    date: 'તારીખ સમજાઈ નથી. કૃપા કરીને કેલેન્ડર ઉપયોગ કરો.',
    gender: 'લિંગ સમજાયું નથી. કૃપા કરીને એક વિકલ્પ પસંદ કરો.',
  },
  ml: {
    date: 'തീയതി മനസ്സിലായില്ല. ദയവായി കലണ്ടർ ഉപയോഗിക്കുക.',
    gender: 'ലിംഗം മനസ്സിലായില്ല. ദയവായി ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.',
  },
  pa: {
    date: 'ਤਾਰੀਖ ਸਮਝ ਨਹੀਂ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਕੈਲੰਡਰ ਵਰਤੋ।',
    gender: 'ਲਿੰਗ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਵਿਕਲਪ ਚੁਣੋ।',
  },
  or: {
    date: 'ତାରିଖ ବୁଝି ପାରିଲି ନାହିଁ। ଦୟାକରି କ୍ୟାଲେଣ୍ଡର ବ୍ୟବହାର କରନ୍ତୁ।',
    gender: 'ଲିଙ୍ଗ ବୁଝି ପାରିଲି ନାହିଁ। ଦୟାକରି ଏକ ବିକଳ୍ପ ବାଛନ୍ତୁ।',
  },
  as: {
    date: 'তাৰিখ বুজিব নোৱাৰিলোঁ। অনুগ্ৰহ কৰি কেলেণ্ডাৰ ব্যৱহাৰ কৰক।',
    gender: 'লিংগ বুজিব নোৱাৰিলোঁ। অনুগ্ৰহ কৰি এটা বিকল্প বাচনি কৰক।',
  },
};

function PermissionCard({
  checked,
  title,
  body,
  icon,
  onToggle,
  onFocus,
}: {
  checked: boolean;
  title: string;
  body: string;
  icon: React.ReactNode;
  onToggle: () => void;
  onFocus: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onFocus();
        onToggle();
      }}
      onFocus={onFocus}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
        checked ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${checked ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-transparent'}`}>
              <Check size={14} />
            </div>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{body}</p>
        </div>
      </div>
    </button>
  );
}

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const initialLanguage = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setParentName = useAppStore((state) => state.setParentName);
  const setActiveChildId = useAppStore((state) => state.setActiveChildId);
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<'language' | 'slides' | 'setup'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(initialLanguage || 'en');
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeField, setActiveField] = useState<SetupField>('parent');
  const [parentName, setParentNameLocal] = useState('');
  const [childName, setChildName] = useState('');
  const [dob, setDob] = useState('');
  const [birthVaccineOptions, setBirthVaccineOptions] = useState<BirthVaccineOption[]>([]);
  const [selectedBirthVaccines, setSelectedBirthVaccines] = useState<string[]>([]);
  const [gender, setGender] = useState<typeof GENDER_VALUES[number]>('male');
  const [allowLocation, setAllowLocation] = useState(true);
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const { t } = useTranslation();

  const updateProfile = useUpdateUserProfile();
  const createChild = useCreateChild();

  const copy = getOnboardingCopy(selectedLanguage);
  const birthVaccineCopy = getBirthVaccineCopy(selectedLanguage);
  const fieldErrors = FIELD_ERRORS[selectedLanguage] ?? FIELD_ERRORS.en;
  const slides = useMemo(
    () => copy.slides.map((slide, index) => ({ ...slide, ...SLIDE_THEMES[index] })),
    [copy],
  );
  const isLastSlide = slideIndex === slides.length - 1;
  const currentSlide = slides[slideIndex];
  const needsBirthVaccineSelection = useMemo(
    () => isDobBeforeToday(dob) && birthVaccineOptions.length > 0,
    [dob, birthVaccineOptions],
  );
  const canFinish = parentName.trim().length >= 2 && childName.trim().length >= 2 && Boolean(dob);

  useEffect(() => {
    let ignore = false;

    void fetchBirthVaccineOptions()
      .then((options) => {
        if (!ignore) {
          setBirthVaccineOptions(options);
        }
      })
      .catch(() => {
        if (!ignore) {
          setBirthVaccineOptions([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (stage === 'setup') {
      setActiveField('parent');
      setVoiceError('');
    }
  }, [stage]);

  useEffect(() => {
    if (needsBirthVaccineSelection) return;
    if (selectedBirthVaccines.length > 0) {
      setSelectedBirthVaccines([]);
    }
    if (activeField === 'birthVaccines') {
      setActiveField('gender');
    }
  }, [activeField, needsBirthVaccineSelection, selectedBirthVaccines.length]);

  const guidePrompt = useMemo(() => {
    if (stage === 'language') return getVoicePrompt(selectedLanguage, 'chooseLanguage');
    if (stage === 'slides') return `${currentSlide.title}. ${currentSlide.body}`;

    switch (activeField) {
      case 'parent':
        return `${getVoicePrompt(selectedLanguage, 'familyIntro')} ${getVoicePrompt(selectedLanguage, 'parentName')}`;
      case 'child':
        return getVoicePrompt(selectedLanguage, 'childName');
      case 'dob':
        return getVoicePrompt(selectedLanguage, 'dob');
      case 'birthVaccines':
        return birthVaccineCopy.prompt;
      case 'gender':
        return getVoicePrompt(selectedLanguage, 'gender');
      case 'permissions':
        return getVoicePrompt(selectedLanguage, 'permissions');
      default:
        return getVoicePrompt(selectedLanguage, 'familyIntro');
    }
  }, [activeField, birthVaccineCopy.prompt, currentSlide.body, currentSlide.title, selectedLanguage, stage]);

  const setDobValue = (value: string) => {
    setDob(value);
    if (isDobBeforeToday(value) && birthVaccineOptions.length > 0) {
      setActiveField('birthVaccines');
      return;
    }
    setActiveField('gender');
  };

  const toggleBirthVaccine = (vaccineId: string) => {
    setSelectedBirthVaccines((current) =>
      current.includes(vaccineId)
        ? current.filter((id) => id !== vaccineId)
        : [...current, vaccineId],
    );
  };

  const moveToSlides = () => {
    setLanguage(selectedLanguage);
    setStage('slides');
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    setLanguage(language);
    setVoiceError('');
  };

  const handleVoiceAnswer = (transcript: string) => {
    setVoiceError('');
    const cleanText = transcript.trim();
    if (!cleanText) return;

    if (activeField === 'parent') {
      setParentNameLocal(toTitleCase(cleanText));
      setActiveField('child');
      return;
    }

    if (activeField === 'child') {
      setChildName(toTitleCase(cleanText));
      setActiveField('dob');
      return;
    }

    if (activeField === 'dob') {
      const parsedDate = parseSpokenDate(cleanText);
      if (!parsedDate) {
        setVoiceError(fieldErrors.date);
        return;
      }
      setDobValue(parsedDate);
      return;
    }

    if (activeField === 'birthVaccines') {
      const parsedSelection = parseBirthVaccineSpeech(cleanText, birthVaccineOptions);
      if (!parsedSelection) return;

      if (parsedSelection.clear) {
        setSelectedBirthVaccines([]);
      } else if (parsedSelection.selectedIds.length > 0) {
        setSelectedBirthVaccines(parsedSelection.selectedIds);
      }

      if (parsedSelection.advance) {
        setActiveField('gender');
      }
      return;
    }

    if (activeField === 'gender') {
      const parsedGender = matchGenderFromSpeech(cleanText);
      if (!parsedGender) {
        setVoiceError(fieldErrors.gender);
        return;
      }
      setGender(parsedGender);
      setActiveField('permissions');
    }
  };

  const handleFinish = async () => {
    if (!canFinish || saving) return;

    setSaving(true);
    setError('');

    const cleanParent = parentName.trim();
    const cleanChild = childName.trim();

    try {
      setLanguage(selectedLanguage);
      setParentName(cleanParent);

      const profile = await updateProfile.mutateAsync({
        data: {
          name: cleanParent,
          language: selectedLanguage as never,
          notificationsEnabled: allowNotifications,
        } as never,
      });

      const child = await createChild.mutateAsync({
        data: {
          name: cleanChild,
          dob,
          gender,
        },
      });

      if (selectedBirthVaccines.length > 0) {
        await completeBirthVaccines(child.id, selectedBirthVaccines, dob);
      }

      if (profile?.name) setParentName(profile.name);
      if (profile?.language) setLanguage(profile.language as Language);
      setActiveChildId(child.id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetVaccineScheduleQueryKey(child.id) }),
      ]);

      if (allowLocation) navigator.geolocation?.getCurrentPosition(() => undefined, () => undefined);
      if (allowNotifications) {
        try {
          await Notification.requestPermission?.();
        } catch {
          /* ignore notification prompt failures */
        }
      }

      onComplete();
    } catch {
      setError(copy.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f7fb] text-gray-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.08),_transparent_32%)]" />
      <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-white via-blue-50/70 to-transparent" />
      <div className="relative flex min-h-screen items-center justify-center px-5 py-5">
        <AnimatePresence mode="wait">
          {stage === 'language' && (
            <motion.div
              key="language"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full max-w-lg rounded-[30px] border border-gray-200 bg-white p-6 shadow-xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Sparkles size={14} />
                Raksha Setu
              </div>

              <SwasthyaSewaGuide
                prompt={guidePrompt}
                language={selectedLanguage}
                allowVoiceInput={false}
                className="mb-5"
                showUi={false}
              />

              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Languages size={30} />
              </div>
              <h1 className="text-3xl font-bold leading-tight">{copy.languageTitle}</h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{copy.languageBody}</p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {LANGS.map(({ code, accent }) => {
                  const active = code === selectedLanguage;
                  const label = LANGUAGE_NAMES[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleLanguageSelect(code)}
                      className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                        active
                          ? 'border-primary bg-primary/8 shadow-sm'
                          : 'border-gray-200 bg-gray-50 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-lg font-bold text-white shadow-sm`}>
                          {label.charAt(0)}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${active ? 'text-primary' : 'text-gray-800'}`}>{label}</p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{code}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={moveToSlides}
                className="mt-6 h-13 w-full rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/20"
              >
                {copy.languageButton}
              </button>
            </motion.div>
          )}

          {stage === 'slides' && (
            <motion.div
              key={`slide-${slideIndex}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full max-w-lg overflow-hidden rounded-[34px] border border-gray-200 bg-white shadow-2xl"
            >
              <div className={`bg-gradient-to-br ${currentSlide.bg} px-6 pb-8 pt-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {slides.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full ${index === slideIndex ? 'w-8 bg-white' : 'w-2 bg-white/45'}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStage('setup')}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold"
                  >
                    {copy.skip}
                  </button>
                </div>
                <div className="mt-12 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white/15">
                  <currentSlide.icon size={46} />
                </div>
              </div>

              <div className="bg-white px-6 py-6 text-slate-950">
                <SwasthyaSewaGuide
                  prompt={guidePrompt}
                  language={selectedLanguage}
                  allowVoiceInput={false}
                  className="mb-5"
                  showUi={false}
                />

                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  <Sparkles size={14} />
                  Raksha Setu
                </div>
                <h2 className="mt-4 text-[28px] font-bold leading-tight">{currentSlide.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{currentSlide.body}</p>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => (slideIndex === 0 ? setStage('language') : setSlideIndex((value) => value - 1))}
                    className="flex h-13 w-13 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => (isLastSlide ? setStage('setup') : setSlideIndex((value) => value + 1))}
                    className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 font-bold text-white"
                  >
                    {isLastSlide ? copy.setupNow : copy.next}
                    <ChevronRight size={18} />
                  </button>
                </div>
                <p className="mt-4 text-center text-[11px] text-slate-400">{copy.footer}</p>
              </div>
            </motion.div>
          )}

          {stage === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="w-full max-w-lg rounded-[30px] border border-gray-200 bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold leading-tight">{copy.setupTitle}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{copy.setupBody}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStage('slides')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 hover:border-primary/40 hover:text-primary"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              <SwasthyaSewaGuide
                prompt={guidePrompt}
                language={selectedLanguage}
                onTranscript={handleVoiceAnswer}
                autoListen={activeField !== 'permissions'}
                allowVoiceInput={activeField !== 'permissions'}
                className="mt-5"
                showUi={false}
              />

              <div className="mt-6 space-y-4">
                <div onFocusCapture={() => setActiveField('parent')}>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <User size={15} className="text-primary" />
                    {copy.parentLabel}
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(event) => setParentNameLocal(event.target.value)}
                    onFocus={() => setActiveField('parent')}
                    placeholder={copy.parentPlaceholder}
                    className="h-13 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white"
                  />
                </div>

                <div onFocusCapture={() => setActiveField('child')}>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <Baby size={15} className="text-primary" />
                    {t('childNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(event) => setChildName(event.target.value)}
                    onFocus={() => setActiveField('child')}
                    placeholder={t('enterFullName')}
                    className="h-13 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary focus:bg-white"
                  />
                </div>

                <div onFocusCapture={() => setActiveField('dob')}>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <CalendarDays size={15} className="text-primary" />
                    {t('dobLabel')}
                  </label>
                  <input
                    type="date"
                    value={dob}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(event) => setDobValue(event.target.value)}
                    onFocus={() => setActiveField('dob')}
                    className="h-13 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-gray-900 outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                {needsBirthVaccineSelection && (
                  <div
                    onFocusCapture={() => setActiveField('birthVaccines')}
                    className="rounded-[26px] border border-sky-100 bg-sky-50/80 p-4"
                  >
                    <p className="text-sm font-bold text-slate-900">{birthVaccineCopy.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{birthVaccineCopy.body}</p>
                    <p className="mt-2 text-[11px] font-medium text-slate-500">{birthVaccineCopy.hint}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {birthVaccineOptions.map((vaccine) => {
                        const selected = selectedBirthVaccines.includes(vaccine.id);
                        return (
                          <button
                            key={vaccine.id}
                            type="button"
                            onClick={() => toggleBirthVaccine(vaccine.id)}
                            onFocus={() => setActiveField('birthVaccines')}
                            className={`rounded-full border px-3 py-2 text-sm font-semibold transition-all ${
                              selected
                                ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20'
                                : 'border-sky-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5'
                            }`}
                          >
                            {vaccine.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">{t('genderLabel')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {GENDER_VALUES.map((value) => {
                      const label = value === 'male' ? t('boyLabel') : value === 'female' ? t('girlLabel') : t('otherGender');
                      const active = gender === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setActiveField('gender');
                            setGender(value);
                          }}
                          onFocus={() => setActiveField('gender')}
                          className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${
                            active
                              ? 'border-primary bg-primary/8 text-primary'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-gray-800">{copy.permissionsLabel}</p>
                <div className="space-y-3">
                  <PermissionCard
                    checked={allowLocation}
                    title={copy.locationTitle}
                    body={copy.locationBody}
                    icon={<MapPin size={18} />}
                    onToggle={() => setAllowLocation((value) => !value)}
                    onFocus={() => setActiveField('permissions')}
                  />
                  <PermissionCard
                    checked={allowNotifications}
                    title={copy.notificationsTitle}
                    body={copy.notificationsBody}
                    icon={<Bell size={18} />}
                    onToggle={() => setAllowNotifications((value) => !value)}
                    onFocus={() => setActiveField('permissions')}
                  />
                </div>
              </div>

              {voiceError && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {voiceError}
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish || saving}
                className="mt-6 h-13 w-full rounded-2xl bg-primary font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {saving ? copy.saving : copy.finish}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
