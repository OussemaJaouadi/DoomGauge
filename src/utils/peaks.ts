/**
 * Peak detection utilities for DoomGauge
 * Finds meaningful peaks and valleys in hourly/reel data
 */

import type { HourItem, Interval, PeakRange, ValleyRange } from '../types/models';



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
    const item = data[i];
    if (!item) continue;
    const total = item.total;
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
  
  return clusters;
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
    const item = data[i];
    if (!item) continue;
    if (item.total === 0) {
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
