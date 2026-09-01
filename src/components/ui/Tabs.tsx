import React, { createContext, useContext } from 'react';
import './Tabs.css';

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  children,
  className = '',
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`ui-tabs ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="tablist" className={`ui-tabs-list ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  icon,
}: {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be inside Tabs');
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      className={`ui-tabs-trigger ${active ? 'ui-tabs-trigger-active' : ''}`}
      onClick={() => ctx.onValueChange(value)}
      type="button"
    >
      {icon && <span className="ui-tabs-trigger-icon">{icon}</span>}
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be inside Tabs');
  if (ctx.value !== value) return null;
  return <div role="tabpanel" className={`ui-tabs-content ${className}`}>{children}</div>;
}
