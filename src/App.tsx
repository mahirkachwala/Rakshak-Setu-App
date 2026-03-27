import { useEffect, useState } from 'react';
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetUserProfile, useListChildren } from "@workspace/api-client-react";

import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Schedule from "@/pages/Schedule";
import Centers from "@/pages/Centers";
import Assistant from "@/pages/Assistant";
import Emergency from "@/pages/Emergency";
import Children from "@/pages/Children";
import Settings from "@/pages/Settings";
import Guidance from "@/pages/Guidance";
import ABHA from "@/pages/ABHA";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/not-found";
import {
  initializeVoiceInteractionTracking,
  stopSpeechPlayback,
  stopSpeechRecognition,
} from "@/lib/voice";

const ONBOARDING_KEY = 'swasthya-setu-onboarded-v5';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function VoiceRouteGuard() {
  const [location] = useLocation();

  useEffect(() => {
    stopSpeechPlayback();
    stopSpeechRecognition();
  }, [location]);

  return null;
}

function Router() {
  return (
    <Layout>
      <VoiceRouteGuard />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/centers" component={Centers} />
        <Route path="/assistant" component={Assistant} />
        <Route path="/emergency" component={Emergency} />
        <Route path="/children" component={Children} />
        <Route path="/settings" component={Settings} />
        <Route path="/abha" component={ABHA} />
        <Route path="/guidance" component={Guidance} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppContent() {
  const [forceOnboarding, setForceOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
  });
  const [dismissOnboarding, setDismissOnboarding] = useState(false);
  const { data: profile, isLoading: profileLoading } = useGetUserProfile();
  const { data: children, isLoading: childrenLoading } = useListChildren();

  const normalizedName = profile?.name?.trim().toLowerCase() ?? '';
  const hasPlaceholderProfile = normalizedName === 'parent' && (children?.length ?? 0) <= 1;
  const hasLoadedSetupData = !profileLoading && !childrenLoading;
  const needsSetup = hasLoadedSetupData
    ? !profile?.name?.trim() || !children?.length || hasPlaceholderProfile
    : false;
  const showOnboarding = !dismissOnboarding && (forceOnboarding || needsSetup);

  useEffect(() => {
    stopSpeechPlayback();
    stopSpeechRecognition();
  }, [showOnboarding]);

  const handleOnboardingComplete = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setForceOnboarding(false);
    setDismissOnboarding(true);
  };

  if (!forceOnboarding && !hasLoadedSetupData) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      {showOnboarding ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <Router />
      )}
    </WouterRouter>
  );
}

function App() {
  useEffect(() => {
    initializeVoiceInteractionTracking();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
