/**
 * Managed Services Contact Button
 * Client-side component to handle LeadFormModal opening
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import LeadFormModal from './LeadFormModal';

interface Props {
  lang: 'es' | 'en';
  ctaText: string;
}

export default function ManagedServicesButton({ lang, ctaText }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 w-full text-center rounded-xl border border-border py-2.5 px-4 text-sm font-bold text-text hover:border-accent/50 hover:text-accent transition-all"
      >
        {ctaText}
      </button>

      {isModalOpen && createPortal(
        <LeadFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          lang={lang}
        />,
        document.body
      )}
    </>
  );
}
