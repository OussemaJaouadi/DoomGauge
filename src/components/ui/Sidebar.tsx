import React from 'react';
import './Sidebar.css';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  brandText?: string;
  brandIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Sidebar({ isCollapsed, onToggleCollapse, brandText = 'DOOMGAUGE', brandIcon, children }: SidebarProps) {
  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <span className="brand-text">{brandText}</span>
        {brandIcon}
      </div>
      {children}
      <button
        className="rail-handle"
        onClick={onToggleCollapse}
        type="button"
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? <span>›</span> : <span>‹</span>}
      </button>
    </nav>
  );
}

export interface SidebarListProps {
  children: React.ReactNode;
}

export function SidebarList({ children }: SidebarListProps) {
  return <div className="nav-list">{children}</div>;
}

export interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

export function SidebarItem({ icon, label, isActive, onClick }: SidebarItemProps) {
  return (
    <button className={`nav-item ${isActive ? 'active' : ''}`} onClick={onClick} type="button">
      {icon} <span className="nav-label">{label}</span>
    </button>
  );
}

export function SidebarSpacer() {
  return <div className="nav-spacer" />;
}
