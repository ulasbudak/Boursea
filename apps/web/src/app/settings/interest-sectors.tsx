"use client";

import { ALL_SECTORS, translateSector, type Locale, type Messages } from "@boursea/shared";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { setInterestSectors } from "./actions";

export function InterestSectors({
  currentSectors,
  locale,
  messages,
}: {
  currentSectors: string[];
  locale: Locale;
  messages: Messages["personalization"];
}) {
  function toggle(sector: string) {
    const next = currentSectors.includes(sector)
      ? currentSectors.filter((s) => s !== sector)
      : [...currentSectors, sector];
    setInterestSectors(next);
  }

  return (
    <div>
      <p className="mb-3 text-xs text-text-tertiary">{messages.interestSectorsHint}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={messages.interestSectorsTitle}>
        {ALL_SECTORS.map((sector) => (
          <ToggleChip
            key={sector}
            active={currentSectors.includes(sector)}
            onClick={() => toggle(sector)}
          >
            {translateSector(sector, locale)}
          </ToggleChip>
        ))}
      </div>
    </div>
  );
}
