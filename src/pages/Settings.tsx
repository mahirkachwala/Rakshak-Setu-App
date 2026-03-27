import React, { useEffect, useMemo, useState } from 'react';
import {
  Globe, Bell, User, Shield, FileText, ChevronRight, HelpCircle,
  Languages, LogOut, CheckCircle, Lock, Moon, Sun, Phone,
  Baby, Plus, Trash2, X, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Switch } from '@/components/ui/switch';
import {
  useGetUserProfile,
  useListChildren,
  useCreateChild,
  useDeleteChild,
  useUpdateUserProfile,
  CreateChildGender,
} from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { LANGUAGE_NAMES, Language, useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardSummaryQueryKey,
  getGetUserProfileQueryKey,
  getListChildrenQueryKey,
} from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import { getVoiceFieldError, getVoicePrompt } from '@/lib/voicePrompts';
import { matchGenderFromSpeech, parseSpokenDate, toTitleCase } from '@/lib/voice';

function AddChildModal({ onClose }: { onClose: () => void }) {
  const { t, language } = useTranslation();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<CreateChildGender>('male');
  const [activeField, setActiveField] = useState<'name' | 'dob' | 'gender'>('name');
  const [voiceError, setVoiceError] = useState('');
  const queryClient = useQueryClient();
  const mutation = useCreateChild({
    mutation: {
      onSuccess: (newChild) => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        useAppStore.getState().setActiveChildId(newChild.id);
        onClose();
      }
    }
  });
  const guidePrompt = useMemo(() => {
    if (activeField === 'name') return getVoicePrompt(language, 'childProfile');
    if (activeField === 'dob') return getVoicePrompt(language, 'dob');
    return getVoicePrompt(language, 'gender');
  }, [activeField, language]);
  const handleTranscript = (transcript: string) => {
    setVoiceError('');
    const cleanText = transcript.trim();
    if (!cleanText) return;

    if (activeField === 'name') {
      setName(toTitleCase(cleanText));
      setActiveField('dob');
      return;
    }

    if (activeField === 'dob') {
      const parsedDate = parseSpokenDate(cleanText);
      if (!parsedDate) {
        setVoiceError(getVoiceFieldError(language, 'date'));
        return;
      }
      setDob(parsedDate);
      setActiveField('gender');
      return;
    }

    const parsedGender = matchGenderFromSpeech(cleanText);
    if (!parsedGender) {
      setVoiceError(getVoiceFieldError(language, 'gender'));
      return;
    }
    setGender(parsedGender);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ data: { name, dob, gender } });
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('addNewChildProfile')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <SwasthyaSewaGuide
            prompt={guidePrompt}
            language={language}
            onTranscript={handleTranscript}
            autoListen
            className="mb-1"
            showUi={false}
          />
          <div onFocusCapture={() => setActiveField('name')}>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('childNameLabel')}</label>
            <Input placeholder={t('enterFullName')} value={name} onChange={e => setName(e.target.value)} onFocus={() => setActiveField('name')} required className="dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div onFocusCapture={() => setActiveField('dob')}>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('dobLabel')}</label>
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} onFocus={() => setActiveField('dob')} required max={new Date().toISOString().split('T')[0]} className="dark:bg-gray-800 dark:border-gray-700" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-1">{t('genderLabel')}</label>
            <Select value={gender} onValueChange={(v: any) => setGender(v)}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700" onFocus={() => setActiveField('gender')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('boyLabel')}</SelectItem>
                <SelectItem value="female">{t('girlLabel')}</SelectItem>
                <SelectItem value="other">{t('otherGender')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {voiceError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {voiceError}
            </div>
          )}
          <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={mutation.isPending}>
            {mutation.isPending ? `${t('addBaby')}...` : t('addChildSchedule')}
          </Button>
        </form>
      </div>
    </div>
  );
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);
  const darkMode = useAppStore(state => state.darkMode);
  const toggleDarkMode = useAppStore(state => state.toggleDarkMode);
  const activeChildId = useAppStore(state => state.activeChildId);
  const setActiveChildId = useAppStore(state => state.setActiveChildId);
  const parentName = useAppStore(state => state.parentName);
  const setParentName = useAppStore(state => state.setParentName);
  const { data: profile } = useGetUserProfile();
  const { data: children } = useListChildren();
  const [, navigate] = useLocation();
  const [notifs, setNotifs] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(parentName || profile?.name || '');
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;

  const queryClient = useQueryClient();
  const updateProfile = useUpdateUserProfile({
    mutation: {
      onSuccess: (updatedProfile) => {
        if (updatedProfile?.name) {
          setParentName(updatedProfile.name);
        }
        if (updatedProfile?.language) {
          setLanguage(updatedProfile.language as Language);
        }
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      }
    }
  });
  const deleteChild = useDeleteChild({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  useEffect(() => {
    if (profile?.notificationsEnabled != null) {
      setNotifs(profile.notificationsEnabled);
    }
  }, [profile?.notificationsEnabled]);

  useEffect(() => {
    setNameInput(parentName || profile?.name || '');
  }, [parentName, profile?.name]);

  const persistProfile = async (overrides?: {
    name?: string;
    language?: Language;
    notificationsEnabled?: boolean;
  }) => {
    const resolvedName = (overrides?.name ?? nameInput ?? profile?.name ?? parentName).trim();
    await updateProfile.mutateAsync({
      data: {
        name: resolvedName || profile?.name || parentName || undefined,
        language: (overrides?.language ?? language) as any,
        notificationsEnabled: overrides?.notificationsEnabled ?? notifs,
      } as any,
    });
  };

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950 min-h-full pb-24">

      {/* Modals */}
      {showAddChild && <AddChildModal onClose={() => setShowAddChild(false)} />}

      {activeModal === 'vaccination-records' && (
        <InfoModal title="Vaccination Records" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Your Records</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">All vaccination records for linked children are stored securely. Visit the Schedule page to view and download individual records for each child.</p>
            </div>
            <button onClick={() => { setActiveModal(null); navigate('/schedule'); }}
              className="w-full h-10 bg-blue-600 text-white rounded-xl text-sm font-bold">
              View in Schedule →
            </button>
          </div>
        </InfoModal>
      )}

      {activeModal === 'health-card' && (
        <InfoModal title="Digital Health Card" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-900 text-center">
              <p className="text-4xl mb-2">🏥</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-300">Universal Immunization Card</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Link your ABHA Health ID to get a digital immunization card recognised at all government health facilities.</p>
            </div>
            <button onClick={() => { setActiveModal(null); navigate('/abha'); }}
              className="w-full h-10 bg-green-600 text-white rounded-xl text-sm font-bold">
              Set Up ABHA Health ID →
            </button>
          </div>
        </InfoModal>
      )}

      {activeModal === 'pmjay' && (
        <InfoModal title="PM-JAY Benefits" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-100 dark:border-amber-900">
              <p className="font-bold text-amber-800 dark:text-amber-300 text-base mb-1">🏥 Ayushman Bharat PM-JAY</p>
              <p className="text-xs">Provides health coverage up to ₹5 lakh per family per year for secondary and tertiary hospitalisation.</p>
            </div>
            <div className="space-y-2">
              {['Free treatment at empanelled hospitals', 'Covers 1,400+ medical packages', 'No cap on family size', 'Cashless and paperless', 'Available across India'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">Helpline: 14555 · pmjay.gov.in</p>
          </div>
        </InfoModal>
      )}

      {activeModal === 'rbsk' && (
        <InfoModal title="Rashtriya Bal Swasthya Karyakram" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
              <p className="font-bold text-blue-800 dark:text-blue-300 text-base mb-1">💊 RBSK Programme</p>
              <p className="text-xs">Free health screening and early intervention for children from birth to 18 years under 4D — Defects at Birth, Deficiencies, Diseases, and Developmental Delays.</p>
            </div>
            <div className="space-y-2">
              {['Mobile health teams at your doorstep', 'Covers 4Ds — 30 conditions', 'Free referral to govt facilities', 'Early detection saves lives', 'For children 0-18 years'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-blue-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'jsy' && (
        <InfoModal title="Janani Suraksha Yojana" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-pink-50 dark:bg-pink-950/30 rounded-xl p-3 border border-pink-100 dark:border-pink-900">
              <p className="font-bold text-pink-800 dark:text-pink-300 text-base mb-1">🤱 JSY Benefits</p>
              <p className="text-xs">Safe motherhood intervention promoting institutional delivery among below poverty line pregnant women to reduce maternal and neo-natal mortality.</p>
            </div>
            <div className="space-y-2">
              {['Cash assistance for delivery', '₹1400 for rural mothers', '₹1000 for urban mothers', 'Free institutional delivery', 'ASHA support services'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-pink-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'mission-indradhanush' && (
        <InfoModal title="Mission Indradhanush" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl p-3 border border-violet-100 dark:border-violet-900">
              <p className="font-bold text-violet-800 dark:text-violet-300 text-base mb-1">🍼 Mission Indradhanush</p>
              <p className="text-xs">Covers all children under 2 years and pregnant women who are partially vaccinated or unvaccinated — the Rainbow of Vaccines.</p>
            </div>
            <div className="space-y-2">
              {['BCG, OPV, DPT, HepB, Measles', 'Vitamin A supplementation', 'Tetanus toxoid for pregnant women', 'Special drives twice a year', 'District-level implementation'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-violet-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'privacy' && (
        <InfoModal title="Data Privacy" onClose={() => setActiveModal(null)}>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900 text-center">
              <Lock size={32} className="text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 dark:text-green-300">Your Data is Secure</p>
            </div>
            <div className="space-y-2">
              {['Data stored on Indian servers (NIC)', 'Aadhaar verified identity', 'ABDM compliant data standards', 'No data sold to third parties', 'DPDP Act 2023 compliant', 'End-to-end encrypted transfers'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <Shield size={13} className="text-green-500 shrink-0" />
                  <span className="text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </InfoModal>
      )}

      {activeModal === 'help' && (
        <InfoModal title="Help & FAQ" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            {[
              { q: 'How do I add a child?', a: 'Go to My Family → Add Child. Enter name, date of birth and gender. The schedule is auto-generated.' },
              { q: 'How to book a vaccine appointment?', a: 'Go to Centers → select a facility → pick a date and time slot → confirm booking. You\'ll get a PDF slip.' },
              { q: 'Can I cancel or reschedule?', a: 'Yes! Go to Home → Booked Appointments → tap Reschedule or Cancel. You\'ll need to confirm first.' },
              { q: 'How to change language?', a: 'Go to Settings → Language → tap your preferred language from the grid.' },
              { q: 'What is ABHA ID?', a: 'ABHA (Ayushman Bharat Health Account) is your 14-digit digital health ID issued by the National Health Authority.' },
            ].map(({ q, a }, i) => (
              <div key={i} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{q}</p>
                </div>
                <div className="px-3.5 py-2.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
                </div>
              </div>
            ))}
            <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 pt-2">
              Helpline: 104 · Email: support@swasthyasetu.gov.in
            </p>
          </div>
        </InfoModal>
      )}

      {/* Parent profile card */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3.5">
          {/* Avatar with initials */}
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
            {(parentName || profile?.name) ? (
              <span className="text-white text-xl font-bold">
                {(parentName || profile?.name || '').charAt(0).toUpperCase()}
              </span>
            ) : (
              <User size={24} className="text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { void persistProfile({ name: nameInput }); setEditingName(false); }
                    if (e.key === 'Escape') { setNameInput(parentName || profile?.name || ''); setEditingName(false); }
                  }}
                  className="flex-1 text-sm font-bold border border-primary/40 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-primary"
                  placeholder={t('yourName')}
                />
                <button
                  onClick={() => { void persistProfile({ name: nameInput }); setEditingName(false); }}
                  className="text-xs font-bold bg-primary text-white px-2 py-1 rounded-lg"
                >{t('save')}</button>
              </div>
            ) : (
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {parentName || profile?.name || t('parentAccount')}
              </h2>
            )}
            {profile?.phone?.trim() && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {profile.phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {t('swasthyaSetuMember')}
              </span>
              {language && (
                <span className="inline-block text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  🌐 {LANGUAGE_NAMES[language]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setNameInput(parentName || profile?.name || ''); setEditingName(v => !v); }}
            className="text-xs font-bold text-primary border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
          >
            {editingName ? t('cancelEdit') : t('editProfile')}
          </button>
        </div>
      </div>

      {/* Children profiles section */}
      <div className="px-3 pt-3 space-y-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Baby size={15} className="text-primary" /> {t('myChildren')}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {children?.length || 0} {t('childProfiles')}{(children?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowAddChild(true)}
              className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={12} /> {t('addBaby')}
            </button>
          </div>

          {children && children.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {children.map(child => {
                const isActive = activeChildId === child.id;
                const pct = Math.round((child.completedVaccines / child.totalVaccines) * 100);
                const statusColor = child.status === 'safe' ? 'bg-green-500' : child.status === 'due' ? 'bg-amber-500' : 'bg-red-500';
                const statusPill = child.status === 'safe'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                  : child.status === 'due'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
                const statusLabel = child.status === 'safe' ? t('safeStatus') : child.status === 'due' ? t('dueStatus') : t('missedStatus');

                return (
                  <div
                    key={child.id}
                    onClick={() => setActiveChildId(child.id)}
                    className={`px-3.5 py-3 cursor-pointer transition-colors ${isActive ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base text-white shrink-0 ${statusColor}`}>
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{child.name}</p>
                          {isActive && (
                            <span className="text-[9px] font-bold uppercase bg-primary text-white px-1.5 py-0.5 rounded-full">{t('activeLabel')}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          {t('dobLabel')}: {new Date(child.dob).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{pct}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPill}`}>{statusLabel}</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteChild.mutate({ childId: child.id }); }}
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                      {[
                        { val: child.completedVaccines, label: t('vaccineDone') },
                        { val: child.totalVaccines, label: t('vaccineTotal') },
                        { val: `${pct}%`, label: t('progressLabel') },
                      ].map(({ val, label }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1.5 text-center">
                          <p className="text-sm font-bold text-primary">{val}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <Baby size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('noChildrenYet')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('addChildFirst')}</p>
            </div>
          )}
        </div>

        {/* ABHA Integration Card */}
        <button
          onClick={() => navigate('/abha')}
          className="w-full text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">ABHA Health Account</p>
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-full">Set Up</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Create your 14-digit Ayushman Bharat Health ID</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
          </div>
          <div className="px-3.5 pb-2.5 flex items-center gap-4 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2">
            <span className="flex items-center gap-1"><Lock size={9} className="text-primary" /> Aadhaar Verified</span>
            <span className="flex items-center gap-1"><CheckCircle size={9} className="text-green-600" /> NHA Compliant</span>
            <span className="flex items-center gap-1"><Shield size={9} className="text-primary" /> ABDM Linked</span>
          </div>
        </button>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('preferences')}</p>

          {/* Language */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Languages size={15} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('language')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{LANGUAGE_NAMES[language as Language] || 'English'}</p>
              </div>
              <button
                onClick={() => setShowLangPicker(v => !v)}
                className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-lg"
              >
                {showLangPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showLangPicker ? t('closeLang') : t('changeLang')}
              </button>
            </div>
            {showLangPicker && (
              <div className="grid grid-cols-3 gap-1.5 pt-1 pb-2">
                {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(([code, name]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code);
                      setShowLangPicker(false);
                      void persistProfile({ language: code });
                    }}
                    className={`text-xs font-semibold py-2 px-2 rounded-lg border transition-all text-center ${
                      language === code
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary/50 bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />

          {/* Dark Mode */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {darkMode ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('darkMode')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">{darkMode ? t('darkModeOn') : t('darkModeOff')}</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />

          {/* Notifications */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Bell size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('vaccineReminders')}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Push notifications for due dates</p>
              </div>
            </div>
            <Switch checked={notifs} onCheckedChange={(value) => { setNotifs(value); void persistProfile({ notificationsEnabled: value }); }} />
          </div>

          {notifs && (
            <>
              <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                    <Bell size={15} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('remindMe')}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{t('daysBefore')}</p>
                  </div>
                </div>
                <select
                  value={reminderDays}
                  onChange={e => setReminderDays(Number(e.target.value))}
                  className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 outline-none font-semibold text-gray-900 dark:text-white"
                >
                  {[1, 2, 3, 5, 7].map(d => (
                    <option key={d} value={d}>{d} {t('daysBefore')}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Health Records */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('healthRecords')}</p>
          {[
            { icon: FileText, label: 'Vaccination Records', sub: 'Download all vaccination history', color: 'bg-blue-50 dark:bg-blue-950/40', ic: 'text-blue-600 dark:text-blue-400', modal: 'vaccination-records' },
            { icon: Shield, label: 'Health Card', sub: 'Digital immunization card', color: 'bg-green-50 dark:bg-green-950/40', ic: 'text-green-600 dark:text-green-400', modal: 'health-card' },
          ].map(({ icon: Icon, label, sub, color, ic, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={15} className={ic} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* Government Schemes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('govSchemes')}</p>
          {[
            { emoji: '🏥', label: 'PM-JAY Benefits', sub: 'Ayushman Bharat · ₹5L/year coverage', modal: 'pmjay' },
            { emoji: '💊', label: 'RBSK Programme', sub: 'Free child health screening 0–18 years', modal: 'rbsk' },
            { emoji: '🤱', label: 'Janani Suraksha Yojana', sub: 'Maternity benefit scheme', modal: 'jsy' },
            { emoji: '🍼', label: 'Mission Indradhanush', sub: 'Universal immunization programme', modal: 'mission-indradhanush' },
          ].map(({ emoji, label, sub, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-base shrink-0">{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* Security & Legal */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3.5 pt-3 pb-1">{t('securityLegal')}</p>
          {[
            { icon: Shield, label: 'Data Privacy', sub: 'How we protect your data', color: 'bg-green-50 dark:bg-green-950/40', ic: 'text-green-600 dark:text-green-400', modal: 'privacy' },
            { icon: HelpCircle, label: 'Help & FAQ', sub: 'Common questions answered', color: 'bg-violet-50 dark:bg-violet-950/40', ic: 'text-violet-600 dark:text-violet-400', modal: 'help' },
          ].map(({ icon: Icon, label, sub, color, ic, modal }, i, arr) => (
            <React.Fragment key={label}>
              <button
                onClick={() => setActiveModal(modal)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon size={15} className={ic} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-gray-300 dark:text-gray-600" />
              </button>
              {i < arr.length - 1 && <div className="h-px bg-gray-100 dark:bg-gray-800 mx-3.5" />}
            </React.Fragment>
          ))}
        </div>

        {/* App info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 text-center space-y-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Raksha Setu</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Version 1.0.0 · Made for India 🇮🇳</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Built on Ayushman Bharat Digital Mission (ABDM)</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Data powered by NHA · NIC · Government of India</p>
        </div>

        {/* Sign out */}
        <button className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-xl py-3 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
