import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Loader2, Mic, Sparkles, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Language } from '@/store';
import {
  captureSpeechWithBrowser,
  fetchSarvamAudio,
  registerSpeechAudio,
  speakWithBrowser,
  stopSpeechPlayback,
  stopSpeechRecognition,
  unregisterSpeechAudio,
  waitForVoiceInteraction,
} from '@/lib/voice';

const GUIDE_COPY: Record<Language, {
  hear: string;
  answer: string;
  listening: string;
  micError: string;
  voiceError: string;
}> = {
  en: {
    hear: 'Listen again',
    answer: 'Answer by voice',
    listening: 'Listening...',
    micError: 'Mic input is not available in this browser.',
    voiceError: 'Voice prompt is not available right now.',
  },
  hi: {
    hear: 'फिर सुनें',
    answer: 'आवाज़ से जवाब दें',
    listening: 'सुन रही हूँ...',
    micError: 'इस ब्राउज़र में माइक्रोफ़ोन उपलब्ध नहीं है।',
    voiceError: 'अभी आवाज़ नहीं चल सकी।',
  },
  mr: {
    hear: 'पुन्हा ऐका',
    answer: 'आवाजाने उत्तर द्या',
    listening: 'ऐकत आहे...',
    micError: 'या ब्राउझरमध्ये मायक्रोफोन उपलब्ध नाही.',
    voiceError: 'आता आवाज चालू होऊ शकला नाही.',
  },
  bn: {
    hear: 'আবার শুনুন',
    answer: 'কথা বলে উত্তর দিন',
    listening: 'শুনছি...',
    micError: 'এই ব্রাউজারে মাইক্রোফোন উপলব্ধ নয়।',
    voiceError: 'এখন ভয়েস চালানো যাচ্ছে না।',
  },
  te: {
    hear: 'మళ్లీ వినండి',
    answer: 'మాటలతో సమాధానం ఇవ్వండి',
    listening: 'వింటున్నాను...',
    micError: 'ఈ బ్రౌజర్‌లో మైక్ అందుబాటులో లేదు.',
    voiceError: 'ఇప్పుడు వాయిస్ ప్లే కాలేదు.',
  },
  ta: {
    hear: 'மீண்டும் கேளுங்கள்',
    answer: 'குரலில் பதில் சொல்லுங்கள்',
    listening: 'கேட்கிறேன்...',
    micError: 'இந்த உலாவியில் மைக் இல்லை.',
    voiceError: 'இப்போது குரல் இயக்க முடியவில்லை.',
  },
  kn: {
    hear: 'ಮತ್ತೆ ಕೇಳಿ',
    answer: 'ಧ್ವನಿಯಿಂದ ಉತ್ತರಿಸಿ',
    listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ...',
    micError: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮೈಕ್ ಲಭ್ಯವಿಲ್ಲ.',
    voiceError: 'ಈಗ ಧ್ವನಿ ಚಾಲನೆ ಆಗಲಿಲ್ಲ.',
  },
  gu: {
    hear: 'ફરી સાંભળો',
    answer: 'આવાજથી જવાબ આપો',
    listening: 'સાંભળું છું...',
    micError: 'આ બ્રાઉઝરમાં માઇક ઉપલબ્ધ નથી.',
    voiceError: 'હમણાં અવાજ ચલાવી શકાયો નહીં.',
  },
  ml: {
    hear: 'വീണ്ടും കേൾക്കൂ',
    answer: 'ശബ്ദമായി മറുപടി പറയൂ',
    listening: 'കേൾക്കുന്നു...',
    micError: 'ഈ ബ്രൗസറിൽ മൈക്ക് ലഭ്യമല്ല.',
    voiceError: 'ഇപ്പോൾ ശബ്ദം പ്ലേ ചെയ്യാനായില്ല.',
  },
  pa: {
    hear: 'ਫਿਰ ਸੁਣੋ',
    answer: 'ਆਵਾਜ਼ ਨਾਲ ਜਵਾਬ ਦਿਓ',
    listening: 'ਸੁਣ ਰਹੀ ਹਾਂ...',
    micError: 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।',
    voiceError: 'ਹਾਲੇ ਆਵਾਜ਼ ਨਹੀਂ ਚਲ ਸਕੀ।',
  },
  or: {
    hear: 'ପୁଣି ଶୁଣନ୍ତୁ',
    answer: 'ଶବ୍ଦରେ ଉତ୍ତର ଦିଅନ୍ତୁ',
    listening: 'ଶୁଣୁଛି...',
    micError: 'ଏହି ବ୍ରାଉଜରରେ ମାଇକ୍ ଉପଲବ୍ଧ ନାହିଁ।',
    voiceError: 'ଏବେ ଶବ୍ଦ ଚାଲୁ ହୋଇପାରିଲା ନାହିଁ।',
  },
  as: {
    hear: 'আকৌ শুনক',
    answer: 'কথাৰে উত্তৰ দিয়ক',
    listening: 'শুনিছোঁ...',
    micError: 'এই ব্ৰাউজাৰত মাইক উপলব্ধ নহয়।',
    voiceError: 'এতিয়া ভয়চ চলোৱা নগ’ল।',
  },
};

export function getGuideUiCopy(language: Language) {
  return GUIDE_COPY[language] ?? GUIDE_COPY.en;
}

export function SwasthyaSewaAvatar() {
  return (
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <defs>
        <linearGradient id="skinTone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6C7A4" />
          <stop offset="100%" stopColor="#E6A27E" />
        </linearGradient>
        <linearGradient id="sareeBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="sareeAccent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="132" rx="34" ry="6" fill="#D7E6F7" />
      <path d="M30 48C30 26 43 14 60 14C77 14 90 27 90 48V69H30V48Z" fill="#1F2937" />
      <path d="M39 44C39 31 48 22 60 22C72 22 81 31 81 44V72H39V44Z" fill="url(#skinTone)" />
      <path d="M41 42C42 26 51 18 60 18C71 18 80 28 79 44C73 36 63 33 50 34C46 34 43 37 41 42Z" fill="#111827" />
      <circle cx="49" cy="52" r="2.8" fill="#1F2937" />
      <circle cx="71" cy="52" r="2.8" fill="#1F2937" />
      <path d="M53 64C56 67 64 67 67 64" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 44C48 38 56 35 60 35C68 35 75 39 79 47" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
      <circle cx="33" cy="54" r="7" fill="#E5EEF9" />
      <circle cx="87" cy="54" r="7" fill="#E5EEF9" />
      <rect x="24" y="48" width="8" height="24" rx="4" fill="#94A3B8" />
      <rect x="88" y="48" width="8" height="24" rx="4" fill="#94A3B8" />
      <path d="M44 80C44 71 51 64 60 64C69 64 76 71 76 80V94H44V80Z" fill="url(#skinTone)" />
      <path d="M29 132C29 98 40 81 60 81C80 81 91 98 91 132H29Z" fill="url(#sareeBody)" />
      <path d="M60 84C78 84 89 96 93 122C83 112 71 109 60 109C49 109 37 112 27 122C31 96 42 84 60 84Z" fill="url(#sareeAccent)" />
      <path d="M60 86C71 86 79 93 82 104C75 100 67 98 60 98C53 98 45 100 38 104C41 93 49 86 60 86Z" fill="#FFF7ED" opacity="0.92" />
      <circle cx="36" cy="103" r="8" fill="url(#skinTone)" />
      <circle cx="84" cy="103" r="8" fill="url(#skinTone)" />
      <path d="M31 72C27 85 23 98 21 112" stroke="url(#skinTone)" strokeWidth="8" strokeLinecap="round" />
      <path d="M89 72C93 85 97 98 99 112" stroke="url(#skinTone)" strokeWidth="8" strokeLinecap="round" />
      <path d="M97 111C100 108 103 106 107 106" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="109" cy="106" r="4" fill="#F97316" />
      <circle cx="60" cy="60" r="2.2" fill="#FB7185" opacity="0.45" />
    </svg>
  );
}

export interface SwasthyaSewaGuideHandle {
  replay: () => Promise<void>;
  listen: () => Promise<void>;
  stop: () => void;
}

interface SwasthyaSewaGuideProps {
  prompt: string;
  language: Language;
  replayToken?: string | number;
  onTranscript?: (transcript: string) => void;
  autoSpeak?: boolean;
  autoListen?: boolean;
  className?: string;
  muted?: boolean;
  allowVoiceInput?: boolean;
  showUi?: boolean;
  speechRate?: number;
}

const SwasthyaSewaGuide = forwardRef<SwasthyaSewaGuideHandle, SwasthyaSewaGuideProps>(function SwasthyaSewaGuide({
  prompt,
  language,
  replayToken,
  onTranscript,
  autoSpeak = true,
  autoListen = false,
  className,
  muted = false,
  allowVoiceInput = Boolean(onTranscript),
  showUi = true,
  speechRate = 1,
}, ref) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const promptKey = useMemo(
    () => `${language}:${prompt}:${String(replayToken ?? '')}`,
    [language, prompt, replayToken],
  );
  const lastAutoPrompt = useRef('');
  const lastAutoListenPrompt = useRef('');
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const latestPromptKey = useRef(promptKey);
  const isMounted = useRef(true);
  const playbackToken = useRef(0);
  const listeningToken = useRef(0);
  const ui = getGuideUiCopy(language);

  const stopAllVoiceActivity = () => {
    playbackToken.current += 1;
    listeningToken.current += 1;
    stopSpeechPlayback();
    stopSpeechRecognition();
    activeAudio.current?.pause();
    activeAudio.current = null;
  };

  useEffect(() => {
    latestPromptKey.current = promptKey;
  }, [promptKey]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopAllVoiceActivity();
    };
  }, []);

  useEffect(() => {
    if (!muted) return;
    stopAllVoiceActivity();
    if (isMounted.current) {
      setIsSpeaking(false);
      setIsListening(false);
    }
  }, [muted]);

  useEffect(() => {
    if (!autoSpeak || muted || !prompt.trim() || lastAutoPrompt.current === promptKey) return;

    const timer = window.setTimeout(() => {
      lastAutoPrompt.current = promptKey;
      void speakNow(true, autoListen);
    }, 240);

    return () => window.clearTimeout(timer);
  }, [autoListen, autoSpeak, muted, promptKey]);

  useImperativeHandle(ref, () => ({
    replay: async () => {
      await speakNow(true, false);
    },
    listen: async () => {
      await handleMic(false);
    },
    stop: () => {
      stopAllVoiceActivity();
      if (isMounted.current) {
        setIsListening(false);
        setIsSpeaking(false);
      }
    },
  }), [language, promptKey, muted, allowVoiceInput]);

  const playAudioBlob = async (blob: Blob, token: number): Promise<boolean> => {
    if (!isMounted.current || playbackToken.current !== token) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.muted = false;
    audio.playsInline = true;
    audio.preload = 'auto';
    audio.volume = 1;
    audio.defaultPlaybackRate = speechRate;
    audio.playbackRate = speechRate;
    activeAudio.current?.pause();
    activeAudio.current = audio;
    registerSpeechAudio(audio);

    try {
      await new Promise<void>((resolve) => {
        const handleReady = () => resolve();
        const handleFailure = () => resolve();
        audio.onloadeddata = handleReady;
        audio.oncanplaythrough = handleReady;
        audio.onerror = handleFailure;
        audio.load();
        window.setTimeout(resolve, 600);
      });
      if (!isMounted.current || playbackToken.current !== token) return false;
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
      return isMounted.current && playbackToken.current === token;
    } catch {
      return false;
    } finally {
      unregisterSpeechAudio(audio);
      URL.revokeObjectURL(url);
      if (activeAudio.current === audio) {
        activeAudio.current = null;
      }
    }
  };

  const speakNow = async (
    preferPremium: boolean,
    shouldAutoListen = false,
    isRetryAfterInteraction = false,
  ) => {
    if (!prompt.trim() || muted) return;
    const token = playbackToken.current + 1;
    playbackToken.current = token;
    stopSpeechRecognition();
    setVoiceError('');
    setIsSpeaking(true);

    try {
      stopSpeechPlayback();
      activeAudio.current?.pause();
      let played = false;

      if (preferPremium) {
        const audio = await fetchSarvamAudio(prompt, language, speechRate);
        if (!isMounted.current || playbackToken.current !== token) return;
        if (audio) {
          played = await playAudioBlob(audio, token);
          if (played) return;
        }
      }

      played = await speakWithBrowser(prompt, language, speechRate);
      if (!isMounted.current || playbackToken.current !== token) return;
      if (played) return;

      if (!isRetryAfterInteraction) {
        const unlocked = await waitForVoiceInteraction(8000);
        if (
          unlocked
          && isMounted.current
          && playbackToken.current === token
          && latestPromptKey.current === promptKey
        ) {
          await speakNow(preferPremium, shouldAutoListen, true);
          return;
        }
      }

      throw new Error('Voice playback unavailable');
    } catch {
      if (
        isMounted.current
        && playbackToken.current === token
        && latestPromptKey.current === promptKey
      ) {
        setVoiceError(ui.voiceError);
      }
    } finally {
      if (isMounted.current && playbackToken.current === token) {
        setIsSpeaking(false);
      }
      if (
        isMounted.current
        && playbackToken.current === token
        && shouldAutoListen
        && allowVoiceInput
        && onTranscript
        && lastAutoListenPrompt.current !== promptKey
      ) {
        lastAutoListenPrompt.current = promptKey;
        window.setTimeout(() => {
          if (isMounted.current && playbackToken.current === token) {
            void handleMic(true);
          }
        }, 180);
      }
    }
  };

  const handleMic = async (silent = false) => {
    if (!allowVoiceInput) return;
    if (isListening) return;
    const token = listeningToken.current + 1;
    listeningToken.current = token;
    playbackToken.current += 1;
    stopSpeechPlayback();
    stopSpeechRecognition();
    activeAudio.current?.pause();
    activeAudio.current = null;

    if (!silent) setVoiceError('');
    setIsListening(true);
    try {
      const transcript = await captureSpeechWithBrowser(language);
      if (!isMounted.current || listeningToken.current !== token) return;
      setLastTranscript(transcript);
      if (transcript) {
        onTranscript?.(transcript);
      }
    } catch {
      if (isMounted.current && listeningToken.current === token && !silent) {
        setVoiceError(ui.micError);
      }
    } finally {
      if (isMounted.current && listeningToken.current === token) {
        setIsListening(false);
      }
    }
  };

  if (!showUi) return null;

  return (
    <div className={cn('rounded-[28px] border border-[#d8e6f6] bg-[#f8fbff] p-4 shadow-sm', className)}>
      <div className="flex items-start gap-4">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3.2, ease: 'easeInOut' }}
          className="h-24 w-20 shrink-0 rounded-[24px] bg-white p-2 shadow-sm ring-1 ring-[#dbe8f7]"
        >
          <SwasthyaSewaAvatar />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-primary shadow-sm ring-1 ring-[#dbe8f7]">
            <Sparkles size={12} />
            Swasthya Sewa
          </div>

          <div className="mt-3 rounded-[22px] bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm ring-1 ring-[#dbe8f7]">
            {prompt}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void speakNow(true, false)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-transform hover:scale-[1.01]"
            >
              {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              {ui.hear}
            </button>

            {allowVoiceInput && (
              <button
                type="button"
                onClick={() => void handleMic(false)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                  isListening
                    ? 'border-rose-300 bg-rose-50 text-rose-600'
                    : 'border-[#c9ddf3] bg-white text-slate-700',
                )}
              >
                {isListening ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                {isListening ? ui.listening : ui.answer}
              </button>
            )}
          </div>

          {(lastTranscript || voiceError) && (
            <div className="mt-3 rounded-2xl bg-white/90 px-3 py-2 text-xs text-slate-500 ring-1 ring-[#dbe8f7]">
              {voiceError || lastTranscript}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default SwasthyaSewaGuide;
