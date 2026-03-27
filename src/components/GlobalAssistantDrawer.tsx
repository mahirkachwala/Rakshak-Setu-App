import React from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';

import SwasthyaSewaChatPanel from '@/components/SwasthyaSewaChatPanel';
import { SwasthyaSewaAvatar } from '@/components/SwasthyaSewaGuide';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';

interface GlobalAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalAssistantDrawer({
  open,
  onOpenChange,
}: GlobalAssistantDrawerProps) {
  return (
    <>
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex items-center gap-3 sm:bottom-24">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto hidden items-center gap-3 rounded-[24px] bg-white px-3 py-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 transition-transform hover:scale-[1.01] sm:flex"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-50 p-1.5">
            <SwasthyaSewaAvatar />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">AI Care</p>
            <p className="text-sm font-semibold text-slate-700">Chat with Swasthya Sewa</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#6c63ff] to-[#3ab8ff] text-white shadow-lg shadow-primary/20">
            <MessageSquareText size={18} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#6c63ff] to-[#3ab8ff] text-white shadow-xl shadow-primary/30 transition-transform hover:scale-[1.03] sm:hidden"
        >
          <Sparkles size={22} />
        </button>
      </div>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          forceMount
          side="right"
          className="!top-[12vh] !bottom-4 !right-4 !left-auto !h-auto !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] overflow-hidden rounded-[32px] border border-slate-200 bg-[#f6f9ff] p-0 shadow-2xl shadow-slate-900/15 sm:!top-6 sm:!bottom-6 sm:!w-[440px] sm:!max-w-[440px]"
        >
          <SwasthyaSewaChatPanel className="h-full rounded-none shadow-none" />
        </SheetContent>
      </Sheet>
    </>
  );
}
