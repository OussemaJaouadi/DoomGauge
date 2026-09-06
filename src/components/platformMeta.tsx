import React from 'react';
import { MonitorPlay, Camera, MessageCircle } from 'lucide-react';
import type { Platform } from '../types/models';
import { chartTokens } from './tokens';

/** Single home for platform label/icon/color (DRY: rows, legends, tooltips). */
export const platformMeta: Record<Platform, { label: string; icon: React.ReactNode; color: string }> = {
  youtube: { label: 'YouTube', icon: <MonitorPlay size={14} />, color: chartTokens.platform.youtube },
  instagram: { label: 'Instagram', icon: <Camera size={14} />, color: chartTokens.platform.instagram },
  facebook: { label: 'Facebook', icon: <MessageCircle size={14} />, color: chartTokens.platform.facebook },
};
