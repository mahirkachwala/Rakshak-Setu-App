import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Shield, CheckCircle, Smartphone, CreditCard,
  Eye, EyeOff, Download, Share2, RefreshCw, ChevronRight,
  AlertCircle, Info, Lock, Loader2, User, Heart, FileText,
  QrCode, Copy, Check, Star, Activity
} from 'lucide-react';
import { useGetUserProfile, useListChildren } from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoicePrompt } from '@/lib/voicePrompts';
import { extractNumericSpeech } from '@/lib/voice';
import type { Language } from '@/store';

const ABHA_STORAGE_KEY = 'swasthya-setu-abha-data';

type AbhaStep = 'home' | 'method' | 'aadhaar-input' | 'mobile-input' | 'otp' | 'success' | 'card';

interface AbhaData {
  abhaId: string;
  abhaAddress: string;
  name: string;
  dob: string;
  gender: string;
  mobile: string;
  linked: boolean;
}

function makeAbhaId() {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `91-${r()}-${r()}-${r()}`;
}

function nameToAbhaAddress(name: string) {
  return name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + '@abdm';
}

export default function ABHA() {
  const [, navigate] = useLocation();
  const { data: profile } = useGetUserProfile();
  const { data: children } = useListChildren();
  const activeChildId = useAppStore(s => s.activeChildId);
  const language = useAppStore(s => s.language);

  const activeChild = children?.find(c => c.id === activeChildId) || children?.[0];

  const [step, setStep] = useState<AbhaStep>(() => {
    try {
      const saved = localStorage.getItem(ABHA_STORAGE_KEY);
      return saved ? 'card' : 'home';
    } catch { return 'home'; }
  });
  const [hasAbha, setHasAbha] = useState(() => {
    try { return !!localStorage.getItem(ABHA_STORAGE_KEY); } catch { return false; }
  });
  const [abhaData, setAbhaData] = useState<AbhaData | null>(() => {
    try {
      const saved = localStorage.getItem(ABHA_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [method, setMethod] = useState<'aadhaar' | 'mobile' | ''>('');
  const [aadhaarNum, setAadhaarNum] = useState('');
  const [mobileNum, setMobileNum] = useState(profile?.phone || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [masked, setMasked] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const sendOTP = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setStep('otp');
    }, 1500);
  };

  const verifyOTP = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const parentName = profile?.name || 'Parent';
      const childDob = activeChild?.dob
        ? new Date(activeChild.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const gender = activeChild?.gender || profile?.gender || 'Not specified';
      const phone = mobileNum || profile?.phone || '';
      const generated: AbhaData = {
        abhaId: makeAbhaId(),
        abhaAddress: nameToAbhaAddress(parentName),
        name: parentName,
        dob: childDob,
        gender,
        mobile: phone,
        linked: true,
      };
      setHasAbha(true);
      setAbhaData(generated);
      try { localStorage.setItem(ABHA_STORAGE_KEY, JSON.stringify(generated)); } catch {}
      setStep('success');
    }, 2000);
  };

  useEffect(() => {
    if (profile?.phone && !mobileNum) setMobileNum(profile.phone);
  }, [profile?.phone]);

  const copyAbhaId = () => {
    if (abhaData) {
      navigator.clipboard.writeText(abhaData.abhaId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetAbha = () => {
    try { localStorage.removeItem(ABHA_STORAGE_KEY); } catch {}
    setHasAbha(false);
    setAbhaData(null);
    setStep('home');
  };

  const renderStep = () => {
    switch (step) {
      case 'home':
        return hasAbha && abhaData ? (
          <AbhaCardView abha={abhaData} masked={masked} onToggleMask={() => setMasked(!masked)} onCopy={copyAbhaId} copied={copied} onReset={resetAbha} />
        ) : (
          <AbhaHome onStart={() => setStep('method')} />
        );

      case 'method':
        return (
          <MethodSelect
            language={language}
            onSelect={(m) => { setMethod(m); setStep(m === 'aadhaar' ? 'aadhaar-input' : 'mobile-input'); }}
            onBack={() => setStep('home')}
          />
        );

      case 'aadhaar-input':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('method')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">Enter Aadhaar Number</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'aadhaar')}
              language={language}
              onTranscript={(transcript) => setAadhaarNum(extractNumericSpeech(transcript, 12))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-[12px] text-amber-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Your 12-digit Aadhaar number is used only for OTP verification and is never stored by this app.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Aadhaar Number</label>
              <input
                value={formatAadhaar(aadhaarNum)}
                onChange={e => setAadhaarNum(e.target.value.replace(/\s/g, ''))}
                placeholder="XXXX XXXX XXXX"
                className="w-full h-12 px-4 rounded-xl border-2 border-border focus:border-primary text-lg tracking-widest font-mono outline-none"
                inputMode="numeric"
              />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock size={11} /> End-to-end encrypted · NHA compliant
            </p>
            <button
              onClick={sendOTP}
              disabled={aadhaarNum.length !== 12 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP to Registered Mobile'}
            </button>
            <p className="text-[11px] text-center text-muted-foreground">An OTP will be sent to the mobile number linked with Aadhaar</p>
          </div>
        );

      case 'mobile-input':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('method')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">Enter Mobile Number</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'mobile')}
              language={language}
              onTranscript={(transcript) => setMobileNum(extractNumericSpeech(transcript, 10))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Mobile Number</label>
              <div className="flex gap-2">
                <div className="h-12 px-3 rounded-xl border-2 border-border flex items-center text-sm font-semibold text-muted-foreground">+91</div>
                <input
                  value={mobileNum}
                  onChange={e => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-border focus:border-primary text-base outline-none"
                  inputMode="numeric"
                />
              </div>
            </div>
            <button
              onClick={sendOTP}
              disabled={mobileNum.length !== 10 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
            </button>
          </div>
        );

      case 'otp':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep(method === 'aadhaar' ? 'aadhaar-input' : 'mobile-input')} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft size={16} />
              </button>
              <h2 className="font-bold text-base">Verify OTP</h2>
            </div>
            <SwasthyaSewaGuide
              prompt={getVoicePrompt(language, 'otp')}
              language={language}
              onTranscript={(transcript) => setOtp(extractNumericSpeech(transcript, 6))}
              autoListen
              className="mb-2"
              showUi={false}
            />
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="text-primary" size={24} />
              </div>
              <p className="text-sm font-semibold">OTP sent to {method === 'aadhaar' ? 'Aadhaar-linked' : ''} mobile</p>
              <p className="text-xs text-muted-foreground mt-1">{method === 'mobile' ? `+91 ${mobileNum}` : '+91 XXXXXXXX10'}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Enter 6-digit OTP</label>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                className="w-full h-14 px-4 rounded-xl border-2 border-border focus:border-primary text-2xl tracking-[1rem] font-mono text-center outline-none"
                inputMode="numeric"
              />
            </div>
            <button
              onClick={verifyOTP}
              disabled={otp.length !== 6 || loading}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Verifying & Creating ABHA ID...</>
              ) : 'Verify & Create ABHA ID'}
            </button>
            <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
              <button className="text-primary font-semibold flex items-center gap-1">
                <RefreshCw size={11} /> Resend OTP
              </button>
              <span>in 30s</span>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="p-4 flex flex-col items-center justify-center gap-4 py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={40} />
              </div>
            </motion.div>
            <div className="text-center">
              <h2 className="font-bold text-lg text-green-700">ABHA ID Created!</h2>
              <p className="text-sm text-muted-foreground mt-1">Your Ayushman Bharat Health Account is ready.</p>
            </div>
            <div className="w-full bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">Your ABHA ID</p>
              <p className="text-xl font-bold tracking-widest text-green-800 font-mono">{abhaData?.abhaId}</p>
              <p className="text-xs text-muted-foreground mt-1">{abhaData?.abhaAddress}</p>
            </div>
            <div className="w-full space-y-2 text-[12px] text-muted-foreground bg-muted rounded-xl p-3">
              <p className="font-semibold text-foreground text-xs mb-2">What you can do now:</p>
              {[
                'Share your ABHA ID with hospitals for cashless treatment',
                'View all your health records in one place',
                "Link your children's vaccination records",
                'Get Ayushman Bharat scheme benefits',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle size={12} className="text-green-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('card')}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20"
            >
              View ABHA Card
            </button>
          </div>
        );

      case 'card':
        return abhaData ? (
          <AbhaCardView abha={abhaData} masked={masked} onToggleMask={() => setMasked(!masked)} onCopy={copyAbhaId} copied={copied} onReset={resetAbha} />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="bg-white border-b border-border/60 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display font-bold text-base">ABHA Integration</h1>
            <p className="text-[11px] text-muted-foreground">Ayushman Bharat Health Account</p>
          </div>
          <div className="ml-auto">
            <Shield className="text-primary" size={22} />
          </div>
        </div>
      </div>

      <div className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AbhaHome({ onStart }: { onStart: () => void }) {
  return (
    <div className="p-4 space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">ABHA</p>
            <p className="text-white/70 text-[11px]">Ayushman Bharat Health Account</p>
          </div>
        </div>
        <p className="text-white/90 text-sm leading-relaxed">
          A unique 14-digit health ID that lets you access and share your health records digitally with hospitals across India.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Benefits</p>
        {[
          { icon: FileText, title: 'Digital Health Records', desc: 'All prescriptions, lab reports and discharge summaries in one place' },
          { icon: Heart, title: 'Vaccination Records', desc: "Link your children's vaccination history to ABHA" },
          { icon: CreditCard, title: 'Cashless Treatment', desc: 'Access Ayushman Bharat PM-JAY benefits at 25,000+ hospitals' },
          { icon: Activity, title: 'Health Monitoring', desc: 'Track vitals, conditions and medications over time' },
          { icon: Shield, title: 'Consent-based Sharing', desc: 'You control who can access your health data' },
        ].map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="flex items-start gap-3 bg-white border border-border/60 rounded-xl p-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Icon size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: '54 Cr+', label: 'ABHA IDs created' },
          { val: '25K+', label: 'Hospitals linked' },
          { val: '18+', label: 'States covered' },
        ].map((s, i) => (
          <div key={i} className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
            <p className="font-bold text-primary text-base">{s.val}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info size={13} className="text-blue-600 shrink-0" />
        <span>ABHA is a Government of India initiative under the Ayushman Bharat Digital Mission (ABDM). Your data is protected under NHA guidelines.</span>
      </div>

      <button
        onClick={onStart}
        className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
      >
        Create My ABHA ID <ChevronRight size={16} />
      </button>
    </div>
  );
}

function MethodSelect({ language, onSelect, onBack }: { language: Language; onSelect: (m: 'aadhaar' | 'mobile') => void; onBack: () => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <h2 className="font-bold text-base">Choose Verification Method</h2>
      </div>
      <SwasthyaSewaGuide
        prompt={getVoicePrompt(language, 'abhaMethod')}
        language={language}
        allowVoiceInput={false}
        className="mb-2"
        showUi={false}
      />
      <p className="text-sm text-muted-foreground">Select how you'd like to verify your identity to create your ABHA ID.</p>

      {[
        {
          id: 'aadhaar' as const,
          icon: Shield,
          title: 'Using Aadhaar',
          desc: 'Verify with your 12-digit Aadhaar number. OTP is sent to Aadhaar-linked mobile.',
          recommended: true,
          color: 'text-primary',
          bg: 'bg-primary/10',
        },
        {
          id: 'mobile' as const,
          icon: Smartphone,
          title: 'Using Mobile Number',
          desc: 'Verify with your mobile number. You can link Aadhaar later for full benefits.',
          recommended: false,
          color: 'text-secondary',
          bg: 'bg-secondary/10',
        },
      ].map(({ id, icon: Icon, title, desc, recommended, color, bg }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className="w-full text-left bg-white border-2 border-border hover:border-primary rounded-xl p-4 transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">{title}</span>
                {recommended && (
                  <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-bold">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground mt-1 group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}

      <div className="bg-muted rounded-xl p-3 text-[11px] text-muted-foreground flex items-start gap-2">
        <Lock size={12} className="shrink-0 mt-0.5" />
        <span>Your Aadhaar number is used only for OTP authentication via UIDAI. It is never stored in our servers.</span>
      </div>
    </div>
  );
}

function AbhaCardView({ abha, masked, onToggleMask, onCopy, copied, onReset }: {
  abha: AbhaData;
  masked: boolean;
  onToggleMask: () => void;
  onCopy: () => void;
  copied: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* ABHA Card */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary/80" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">ABHA Card</p>
              <p className="text-white font-bold text-sm">Ayushman Bharat Health Account</p>
            </div>
            <div className="bg-white/20 rounded-xl p-2">
              <Shield size={20} className="text-white" />
            </div>
          </div>

          {/* ABHA ID */}
          <div className="mb-4">
            <p className="text-white/50 text-[10px] font-medium mb-1">ABHA ID</p>
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-lg tracking-widest font-mono">
                {masked ? abha.abhaId.replace(/\d(?=.{4})/g, '•') : abha.abhaId}
              </p>
              <button onClick={onToggleMask} className="bg-white/20 rounded-lg p-1">
                {masked ? <Eye size={13} className="text-white" /> : <EyeOff size={13} className="text-white" />}
              </button>
            </div>
            <p className="text-white/70 text-[11px] mt-1 font-mono">{abha.abhaAddress}</p>
          </div>

          {/* User info */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[10px]">Name</p>
              <p className="text-white font-bold text-sm">{abha.name}</p>
              <p className="text-white/70 text-[11px]">{abha.dob} · {abha.gender}</p>
            </div>
            <div className="text-right">
              <div className="bg-white rounded-lg p-1.5">
                <QrCode size={32} className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy ID', action: onCopy, active: copied },
          { icon: Download, label: 'Download', action: () => {}, active: false },
          { icon: Share2, label: 'Share', action: () => {}, active: false },
        ].map(({ icon: Icon, label, action, active }, i) => (
          <button
            key={i}
            onClick={action}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all ${
              active ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Health Profile */}
      <div className="bg-white border border-border/60 rounded-xl p-4 space-y-3">
        <p className="font-bold text-sm">Health Profile</p>
        {[
          { label: 'ABHA ID', value: masked ? '91-••••-••••-9012' : abha.abhaId },
          { label: 'ABHA Address', value: abha.abhaAddress },
          { label: 'Linked Mobile', value: abha.mobile },
          { label: 'Account Status', value: 'Active & Verified', isStatus: true },
        ].map(({ label, value, isStatus }, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-[12px] text-muted-foreground">{label}</span>
            <span className={`text-[12px] font-semibold ${isStatus ? 'text-green-600' : 'text-foreground'}`}>
              {isStatus && <CheckCircle size={11} className="inline mr-1" />}{value}
            </span>
          </div>
        ))}
      </div>

      {/* Linked Health Records section */}
      <div className="bg-white border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm">Linked Records</p>
          <span className="text-[11px] text-primary font-semibold">3 Records</span>
        </div>
        {[
          { icon: '💉', title: 'BCG Vaccination', date: '15 Mar 2024', facility: 'Municipal Health Centre' },
          { icon: '🩺', title: 'Child Health Checkup', date: '28 Feb 2024', facility: "Dr. Priya's Clinic" },
          { icon: '💊', title: 'OPV Dose 1', date: '10 Jan 2024', facility: 'PHC Andheri' },
        ].map((r, i) => (
          <div key={i} className={`flex items-center gap-3 py-2.5 ${i < 2 ? 'border-b border-border/50' : ''}`}>
            <span className="text-lg">{r.icon}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.facility} · {r.date}</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Scheme benefits */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={14} className="text-amber-600" />
          <p className="font-bold text-sm text-amber-900">PM-JAY Eligibility</p>
        </div>
        <p className="text-[12px] text-amber-800 leading-relaxed">
          Your ABHA ID is linked to Ayushman Bharat PM-JAY. You and your family may be eligible for coverage up to <span className="font-bold">₹5 Lakh/year</span> at 25,000+ empanelled hospitals.
        </p>
        <button className="mt-2 text-[12px] text-amber-700 font-bold flex items-center gap-1">
          Check Eligibility <ChevronRight size={12} />
        </button>
      </div>

      {/* Reset */}
      {onReset && (
        <button
          onClick={() => { if (window.confirm('Reset your ABHA card? This will remove the saved data from this device.')) onReset(); }}
          className="w-full text-center text-[11px] text-muted-foreground py-2 underline underline-offset-2"
        >
          Reset / Clear ABHA data from this device
        </button>
      )}
    </div>
  );
}
