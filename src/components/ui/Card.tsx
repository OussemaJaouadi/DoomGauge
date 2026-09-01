import React from 'react';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return <div className={`ui-card ${className}`} {...props} />;
}

export function CardHeader({ className = '', ...props }: CardProps) {
  return <div className={`ui-card-header ${className}`} {...props} />;
}

export function CardTitle({ className = '', ...props }: CardProps) {
  return <h3 className={`ui-card-title ${className}`} {...props} />;
}

export function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`ui-card-content ${className}`} {...props} />;
}
