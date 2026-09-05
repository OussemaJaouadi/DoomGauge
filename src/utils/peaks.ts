/**
 * Peak detection utilities for DoomGauge
 * Finds meaningful peaks and valleys in hourly/reel data
 */

import type { HourItem, Interval, PeakRange, ValleyRange } from '../types/models';

/**
 * Find local maxima (peaks) in hourly data
 * A local maximum is a hour where total > both neighbors
 */
export function findLocalMaxima(data: HourItem[]): number[] {
  const maxima: number[] = [];
  const len = data.length;
  
  if (len === 0) return maxima;
  if (len === 1) {
    if (data[0].total > 0) maxima.push(0);
    return maxima;
  }
  
  // Cache the previous value to avoid lookups
  let prev = data[0].total;
  let curr = data[1].total;
  
  // Edge case: first item
  if (prev > curr) maxima.push(0);
  
  for (let i = 1; i < len - 1; i++) {
    const next = data[i + 1].total;
    if (curr > prev && curr > next) {
      maxima.push(i);
    }
    prev = curr;
    curr = next;
  }
  
  // Edge case: last item
  if (curr > prev) {
    maxima.push(len - 1);
  }
  
  return maxima;
}

/**
 * Find natural activity clusters (contiguous non-zero hours)
 * and classify each by its peak value
 */
export function findActivityClusters(data: HourItem[]): Interval[] {
  const clusters: Interval[] = [];
  const len = data.length;
  let inCluster = false;
  let clusterStart = 0;
  let clusterTotal = 0;
  let clusterPeak = 0;
  let clusterPeakHour = 0;

  for (let i = 0; i < len; i++) {
    const total = data[i].total;
    if (total > 0) {
      if (!inCluster) {
        inCluster = true;
        clusterStart = i;
        clusterTotal = total;
        clusterPeak = total;
        clusterPeakHour = i;
      } else {
        clusterTotal += total;
        if (total > clusterPeak) {
          clusterPeak = total;
          clusterPeakHour = i;
        }
      }
    } else if (inCluster) {
      inCluster = false;
      clusters.push({
        start: clusterStart,
        end: i - 1,
        peakHour: clusterPeakHour,
        peakValue: clusterPeak,
        total: clusterTotal
      });
    }
  }
  
  if (inCluster) {
    clusters.push({
      start: clusterStart,
      end: len - 1,
      peakHour: clusterPeakHour,
      peakValue: clusterPeak,
      total: clusterTotal
    });
  }
  
  return clusters; // Return chronologically for streaming updates
}

/**
 * Split data into 4-hour intervals and find peak in each
 */
export function get4hIntervals(data: HourItem[]): Interval[] {
  const intervals: Interval[] = [];
  const len = data.length;
  const INTERVAL_SIZE = 4;
  const STRIDE = 2; // Move by 2 hours instead of 4 (sliding window)
  
  for (let i = 0; i <= len - INTERVAL_SIZE; i += STRIDE) {
    const end = i + INTERVAL_SIZE - 1;
    
    let peakValue = 0;
    let peakHour = i;
    let total = 0;
    
    for (let j = i; j <= end; j++) {
      const val = data[j].total;
      total += val;
      if (val > peakValue) {
        peakValue = val;
        peakHour = data[j].hour;
      }
    }
    
    intervals.push({
      start: i,
      end,
      peakHour,
      peakValue,
      total
    });
  }
  
  // Handle edge case if the math doesn't neatly align to the very last hour
  if (intervals[intervals.length - 1].end < len - 1) {
    const i = len - INTERVAL_SIZE;
    const end = len - 1;
    let peakValue = 0; let peakHour = i; let total = 0;
    for (let j = i; j <= end; j++) {
      const val = data[j].total;
      total += val;
      if (val > peakValue) { peakValue = val; peakHour = data[j].hour; }
    }
    intervals.push({ start: i, end, peakHour, peakValue, total });
  }
  
  return intervals;
}

/**
 * Find contiguous ranges of activity and classify them by their peak
 */
export function findPeakRanges(data: HourItem[]): PeakRange[] {
  const ranges: PeakRange[] = [];
  const len = data.length;
  let inRange = false;
  let rangeStart = 0;
  let rangeTotal = 0;
  let rangeMax = 0;
  let rangePeakHour = 0;
  let rangePeakValue = 0;

  for (let i = 0; i < len; i++) {
    const total = data[i].total;
    
    if (total > 0) {
      if (!inRange) {
        inRange = true;
        rangeStart = i;
        rangeTotal = total;
        rangeMax = total;
        rangePeakHour = i;
        rangePeakValue = total;
      } else {
        rangeTotal += total;
        if (total > rangeMax) {
          rangeMax = total;
          rangePeakHour = i;
          rangePeakValue = total;
        }
      }
    } else if (inRange) {
      inRange = false;
      ranges.push({
        start: rangeStart,
        end: i - 1,
        peakHour: rangePeakHour,
        peakValue: rangePeakValue,
        total: rangeTotal
      });
    }
  }
  
  if (inRange) {
    ranges.push({
      start: rangeStart,
      end: len - 1,
      peakHour: rangePeakHour,
      peakValue: rangePeakValue,
      total: rangeTotal
    });
  }
  
  return ranges; // Return chronologically for streaming updates
}

/**
 * Find valley ranges (contiguous hours with zero activity)
 */
export function findValleyRanges(data: HourItem[], minLength: number = 2): ValleyRange[] {
  const ranges: ValleyRange[] = [];
  const len = data.length;
  let inRange = false;
  let rangeStart = 0;

  for (let i = 0; i < len; i++) {
    if (data[i].total === 0) {
      if (!inRange) {
        inRange = true;
        rangeStart = i;
      }
    } else if (inRange) {
      inRange = false;
      if (i - rangeStart >= minLength) {
        ranges.push({ start: rangeStart, end: i - 1 });
      }
    }
  }
  
  if (inRange && len - rangeStart >= minLength) {
    ranges.push({ start: rangeStart, end: len - 1 });
  }
  
  // Sort by length descending
  return ranges.sort((a, b) => (b.end - b.start) - (a.end - a.start));
}





/**
 * Incrementally updates the clusters array with real-time data for the latest hour.
 * Avoids recalculating the entire day's array.
 */
export function updateLatestCluster(
  chronologicalClusters: Interval[], 
  currentHour: HourItem,
  deltaTotal: number
): Interval[] {
  if (currentHour.total === 0) return chronologicalClusters;
  
  const clusters = [...chronologicalClusters];
  const last = clusters.length > 0 ? clusters[clusters.length - 1] : null;

  if (last && (last.end === currentHour.hour || last.end === currentHour.hour - 1)) {
    // Extend or update existing active cluster
    const newTotal = last.end === currentHour.hour 
      ? last.total + deltaTotal // updating same hour
      : last.total + currentHour.total; // new hour added to cluster
      
    const newPeakValue = Math.max(last.peakValue, currentHour.total);
    const newPeakHour = currentHour.total > last.peakValue ? currentHour.hour : last.peakHour;
    
    clusters[clusters.length - 1] = {
      ...last,
      end: currentHour.hour,
      total: newTotal,
      peakValue: newPeakValue,
      peakHour: newPeakHour
    };
  } else {
    // Start a new cluster
    clusters.push({
      start: currentHour.hour,
      end: currentHour.hour,
      peakHour: currentHour.hour,
      peakValue: currentHour.total,
      total: currentHour.total
    });
  }
  
  return clusters;
}
