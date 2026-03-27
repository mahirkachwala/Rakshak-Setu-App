import React, { useEffect, useMemo, useState } from 'react';
import { Baby, Plus, Trash2 } from 'lucide-react';
import {
  CreateChildGender,
  getGetDashboardSummaryQueryKey,
  getGetVaccineScheduleQueryKey,
  getListChildrenQueryKey,
  useCreateChild,
  useDeleteChild,
  useListChildren,
} from '@workspace/api-client-react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import SwasthyaSewaGuide from '@/components/SwasthyaSewaGuide';
import {
  completeBirthVaccines,
  fetchBirthVaccineOptions,
  getBirthVaccineCopy,
  isDobBeforeToday,
  parseBirthVaccineSpeech,
  type BirthVaccineOption,
} from '@/lib/birthVaccines';
import { useTranslation } from '@/lib/i18n';
import { getVoiceFieldError, getVoicePrompt } from '@/lib/voicePrompts';
import { matchGenderFromSpeech, parseSpokenDate, toTitleCase } from '@/lib/voice';

type ChildField = 'name' | 'dob' | 'birthVaccines' | 'gender';

export default function Children() {
  const { data: children, isLoading } = useListChildren();
  const activeChildId = useAppStore((state) => state.activeChildId);
  const setActiveChildId = useAppStore((state) => state.setActiveChildId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const locale = language === 'en' ? 'en-IN' : `${language}-IN`;

  const deleteChild = useDeleteChild({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4 animate-pulse">
        {[1, 2].map((item) => (
          <div key={item} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  const childCount = children?.length ?? 0;
  const pluralSuffix = language === 'en' && childCount !== 1 ? 's' : '';

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 pb-3 pt-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold">{t('myFamily')}</h1>
            <p className="text-xs text-muted-foreground">
              {childCount} {t('childProfiles')}{pluralSuffix}
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-primary/25 transition-colors hover:bg-primary/90">
                <Plus size={14} />
                {t('addBaby')}
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t('addNewChildProfile')}</DialogTitle>
              </DialogHeader>
              <AddChildForm onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        {children?.map((child) => {
          const isActive = activeChildId === child.id;
          const pct = Math.round((child.completedVaccines / child.totalVaccines) * 100);
          const statusBg = child.status === 'safe' ? 'bg-green-500' : child.status === 'due' ? 'bg-amber-500' : 'bg-red-500';
          const statusPill = child.status === 'safe'
            ? 'bg-green-100 text-green-700 border-green-200'
            : child.status === 'due'
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-red-100 text-red-700 border-red-200';
          const statusLabel = child.status === 'safe' ? t('safeStatus') : child.status === 'due' ? t('dueStatus') : t('missedStatus');

          return (
            <div
              key={child.id}
              onClick={() => setActiveChildId(child.id)}
              className={`cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all ${
                isActive
                  ? 'border-primary bg-primary/3 shadow-primary/10'
                  : 'border-border bg-white hover:border-primary/30 dark:bg-gray-900'
              }`}
            >
              <div className="p-3.5">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${statusBg}`}>
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{child.name}</h3>
                      {isActive && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          {t('activeLabel')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('dobLabel')}: {new Date(child.dob).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPill}`}>
                      {statusLabel}
                    </span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteChild.mutate({ childId: child.id });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold leading-none text-primary">{child.completedVaccines}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t('vaccineDone')}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold leading-none text-foreground">{child.totalVaccines}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t('vaccineTotal')}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold leading-none text-foreground">{pct}%</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t('progressLabel')}</p>
                  </div>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {childCount === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border px-4 py-12 text-center text-muted-foreground">
            <Baby className="mx-auto mb-3 text-muted" size={36} />
            <p className="text-sm font-semibold">{t('noChildrenYet')}</p>
            <p className="mt-1 text-xs">{t('addChildFirst')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddChildForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [birthVaccineOptions, setBirthVaccineOptions] = useState<BirthVaccineOption[]>([]);
  const [selectedBirthVaccines, setSelectedBirthVaccines] = useState<string[]>([]);
  const [gender, setGender] = useState<CreateChildGender>('male');
  const [activeField, setActiveField] = useState<ChildField>('name');
  const [voiceError, setVoiceError] = useState('');
  const { t, language } = useTranslation();
  const birthVaccineCopy = getBirthVaccineCopy(language);
  const needsBirthVaccineSelection = isDobBeforeToday(dob) && birthVaccineOptions.length > 0;

  const queryClient = useQueryClient();
  const mutation = useCreateChild();

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
    if (needsBirthVaccineSelection) return;
    if (selectedBirthVaccines.length > 0) {
      setSelectedBirthVaccines([]);
    }
    if (activeField === 'birthVaccines') {
      setActiveField('gender');
    }
  }, [activeField, needsBirthVaccineSelection, selectedBirthVaccines.length]);

  const prompt = useMemo(() => {
    if (activeField === 'name') return getVoicePrompt(language, 'childProfile');
    if (activeField === 'dob') return getVoicePrompt(language, 'dob');
    if (activeField === 'birthVaccines') return birthVaccineCopy.prompt;
    return getVoicePrompt(language, 'gender');
  }, [activeField, birthVaccineCopy.prompt, language]);

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

    const parsedGender = matchGenderFromSpeech(cleanText);
    if (!parsedGender) {
      setVoiceError(getVoiceFieldError(language, 'gender'));
      return;
    }
    setGender(parsedGender);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const newChild = await mutation.mutateAsync({ data: { name, dob, gender } });

      if (selectedBirthVaccines.length > 0) {
        await completeBirthVaccines(newChild.id, selectedBirthVaccines, dob);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetVaccineScheduleQueryKey(newChild.id) }),
      ]);

      useAppStore.getState().setActiveChildId(newChild.id);
      onSuccess();
    } catch {
      setVoiceError(t('tryAgain'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3">
      <SwasthyaSewaGuide
        prompt={prompt}
        language={language}
        onTranscript={handleTranscript}
        autoListen
        className="mb-1"
        showUi={false}
      />

      <div className="space-y-1.5" onFocusCapture={() => setActiveField('name')}>
        <label className="text-sm font-semibold">{t('childNameLabel')}</label>
        <Input
          placeholder={t('enterFullName')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onFocus={() => setActiveField('name')}
          required
        />
      </div>

      <div className="space-y-1.5" onFocusCapture={() => setActiveField('dob')}>
        <label className="text-sm font-semibold">{t('dobLabel')}</label>
        <Input
          type="date"
          value={dob}
          onChange={(event) => setDobValue(event.target.value)}
          onFocus={() => setActiveField('dob')}
          required
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      {needsBirthVaccineSelection && (
        <div
          className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4"
          onFocusCapture={() => setActiveField('birthVaccines')}
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

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">{t('genderLabel')}</label>
        <Select value={gender} onValueChange={(value: CreateChildGender) => setGender(value)}>
          <SelectTrigger onFocus={() => setActiveField('gender')}>
            <SelectValue placeholder={t('selectGender')} />
          </SelectTrigger>
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

      <Button type="submit" className="w-full rounded-full font-bold" disabled={mutation.isPending}>
        {mutation.isPending ? `${t('addBaby')}...` : t('addChildSchedule')}
      </Button>
    </form>
  );
}
