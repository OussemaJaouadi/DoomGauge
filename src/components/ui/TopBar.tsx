import React from 'react';
import './TopBar.css';

export interface TopBarProps {
  children: React.ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="top-bar">
      {children}
    </header>
  );
}

export interface TopBarNavProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function TopBarNav({ children, style }: TopBarNavProps) {
  return (
    <div className="time-nav" style={style}>
      {children}
    </div>
  );
}

export interface TopBarButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function TopBarButton({ children, isActive, disabled, onClick, style, className = '' }: TopBarButtonProps) {
  return (
    <button 
      className={`${isActive ? 'active' : ''} ${className}`.trim()} 
      onClick={onClick} 
      disabled={disabled}
      type="button"
      style={style}
    >
      {children}
    </button>
  );
}
