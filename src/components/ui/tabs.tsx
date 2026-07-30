"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used inside Tabs`);
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ defaultValue, value: controlledValue, onValueChange, ...props }: TabsProps) {
  const generatedId = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;

  const context = React.useMemo<TabsContextValue>(
    () => ({
      value,
      setValue: (nextValue) => {
        if (controlledValue === undefined) {
          setUncontrolledValue(nextValue);
        }
        onValueChange?.(nextValue);
      },
      baseId: generatedId,
    }),
    [controlledValue, generatedId, onValueChange, value]
  );

  return (
    <TabsContext.Provider value={context}>
      <div {...props} />
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        // `max-w-full overflow-x-auto` keeps this row scrollable within its own
        // bounds (identical to the existing DataTable overflow pattern) instead
        // of forcing the whole page wider when every tab label can't fit at a
        // narrow viewport — a flex/inline-flex item's default min-width:auto
        // would otherwise let this row's intrinsic content width push past the
        // page shell's flex column and cause page-level horizontal overflow.
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/60 p-1",
        className
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function focusTab(tabs: HTMLButtonElement[], index: number) {
  const tab = tabs[index];
  tab.focus();
  tab.click();
}

function TabsTrigger({ className, value, onClick, onKeyDown, ...props }: TabsTriggerProps) {
  const context = useTabsContext("TabsTrigger");
  const selected = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${context.baseId}-trigger-${value}`}
      aria-controls={`${context.baseId}-content-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      onClick={(event) => {
        context.setValue(value);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;

        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = Array.from(
          event.currentTarget.closest("[role=\"tablist\"]")?.querySelectorAll<HTMLButtonElement>("[role=\"tab\"]") ?? []
        );
        const currentIndex = tabs.indexOf(event.currentTarget);
        if (currentIndex === -1) return;

        event.preventDefault();
        if (event.key === "Home") {
          focusTab(tabs, 0);
          return;
        }
        if (event.key === "End") {
          focusTab(tabs, tabs.length - 1);
          return;
        }
        const direction = event.key === "ArrowRight" ? 1 : -1;
        focusTab(tabs, (currentIndex + direction + tabs.length) % tabs.length);
      }}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-card",
        className
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

function TabsContent({ className, value, forceMount, ...props }: TabsContentProps) {
  const context = useTabsContext("TabsContent");
  const selected = context.value === value;

  if (!selected && !forceMount) return null;

  return (
    <div
      role="tabpanel"
      id={`${context.baseId}-content-${value}`}
      aria-labelledby={`${context.baseId}-trigger-${value}`}
      hidden={!selected}
      data-state={selected ? "active" : "inactive"}
      className={cn("mt-6 focus-visible:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
