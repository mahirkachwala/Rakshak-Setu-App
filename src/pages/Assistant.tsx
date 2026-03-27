import React from 'react';

import SwasthyaSewaChatPanel from '@/components/SwasthyaSewaChatPanel';

export default function Assistant() {
  return (
    <div className="h-full bg-[#f6f9ff] p-4">
      <SwasthyaSewaChatPanel className="mx-auto h-full max-w-3xl overflow-hidden rounded-[32px]" />
    </div>
  );
}
