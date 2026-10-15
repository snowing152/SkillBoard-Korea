'use client';

import { Tabs } from '@base-ui/react/tabs';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SegmentedTab = { value: string; label: string; content: ReactNode };

type Props = {
  /** Accessible name of the tab list, e.g. "Profile sections". */
  label: string;
  tabs: SegmentedTab[];
  defaultValue?: string;
  className?: string;
};

/**
 * Segmented control on Base UI Tabs (keyboard arrows, ARIA tabs pattern). Panels stay mounted, so
 * hidden tabs are still in the server HTML for search engines. Equal-width segments; a long label
 * wraps to two lines instead of squeezing its neighbour.
 */
export function SegmentedTabs({ label, tabs, defaultValue, className }: Props) {
  return (
    <Tabs.Root
      defaultValue={defaultValue ?? tabs[0]?.value}
      className={cn('flex flex-col gap-stack', className)}
    >
      <Tabs.List
        aria-label={label}
        className="grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-muted p-1"
      >
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            className="min-h-11 rounded-md px-3 py-2 text-body-sm leading-tight text-foreground-secondary transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 data-active:bg-card data-active:font-semibold data-active:text-foreground"
          >
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value} keepMounted className="outline-none">
          {tab.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
