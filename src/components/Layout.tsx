import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Bell,
  Bot,
  CalendarClock,
  Home,
  MapPin,
  Moon,
  Sun,
  TriangleAlert,
  User,
  WifiOff,
} from 'lucide-react';
import { useGetUserProfile, useListChildren } from '@workspace/api-client-react';

import GlobalAssistantDrawer from '@/components/GlobalAssistantDrawer';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

function DarkModeApplier() {
  const darkMode = useAppStore((state) => state.darkMode);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { t } = useTranslation();

  const activeChildId = useAppStore((state) => state.activeChildId);
  const setActiveChildId = useAppStore((state) => state.setActiveChildId);
  const parentName = useAppStore((state) => state.parentName);
  const setParentName = useAppStore((state) => state.setParentName);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const darkMode = useAppStore((state) => state.darkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);

  const { data: profile } = useGetUserProfile();
  const { data: childrenData } = useListChildren();

  useEffect(() => {
    if (!childrenData || childrenData.length === 0) {
      if (activeChildId) setActiveChildId(null);
      return;
    }

    const hasActiveChild = childrenData.some((child) => child.id === activeChildId);
    if (!activeChildId || !hasActiveChild) {
      setActiveChildId(childrenData[0].id);
    }
  }, [childrenData, activeChildId, setActiveChildId]);

  useEffect(() => {
    if (profile?.name && profile.name !== parentName) {
      setParentName(profile.name);
    }
  }, [profile?.name, parentName, setParentName]);

  useEffect(() => {
    if (profile?.language && profile.language !== language) {
      setLanguage(profile.language as any);
    }
  }, [profile?.language, language, setLanguage]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setAssistantOpen(false);
  }, [location]);

  const navItems = [
    { icon: Home, label: t('home'), href: '/' },
    { icon: CalendarClock, label: t('schedule'), href: '/schedule' },
    { icon: MapPin, label: t('centers'), href: '/centers' },
    { icon: Bot, label: t('assistant'), href: '/assistant' },
    { icon: User, label: t('profile'), href: '/settings' },
  ] as const;

  const showFloatingAssistant = location !== '/assistant';

  return (
    <>
      <DarkModeApplier />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <span className="text-xs font-bold leading-none text-white">SS</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">Raksha Setu</span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <Link href="/emergency">
              <button className="flex h-8 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-900/50">
                <TriangleAlert size={12} /> {t('emergency')}
              </button>
            </Link>

            <button className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {!isOnline && (
          <div className="z-30 flex w-full shrink-0 items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white">
            <WifiOff size={14} />
            Offline - showing cached data
          </div>
        )}

        <main className="relative flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
          {children}
          {showFloatingAssistant && (
            <GlobalAssistantDrawer open={assistantOpen} onOpenChange={setAssistantOpen} />
          )}
        </main>

        <nav className="z-40 w-full shrink-0 border-t border-gray-200 bg-white pb-safe dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 items-center justify-around px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));

              const content = (
                <>
                  <div
                    className={cn(
                      'rounded-full px-4 py-1.5 transition-all duration-200',
                      isActive ? 'bg-primary/15 dark:bg-primary/20' : 'bg-transparent',
                    )}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-none',
                      isActive ? 'font-bold text-primary' : 'text-gray-400 dark:text-gray-500',
                    )}
                  >
                    {item.label}
                  </span>
                </>
              );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-full flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
