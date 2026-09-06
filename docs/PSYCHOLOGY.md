# Cognitive Profile & Behavioral Telemetry (PSYCHOLOGY.md)

> **Purpose:** Permanent context anchor for AI pair programmers and human contributors.  
> Read this document to understand **who the user is**, **how their brain works**, and **why DoomGauge is designed the way it is**. Do not make assumptions based on neurotypical productivity apps.

---

## 1. The User: Cognitive Profile

* **auADHD (Autism + ADHD):**
  * **Low Baseline Dopamine & Executive Dysfunction (ADHD):** Getting stuck in involuntary, runaway consumption loops. Standard "soft reminders" or gentle nudges fail because they do not trigger enough arousal to break motor/mental inertia.
  * **Urgency-Activated Prefrontal Cortex:** The brain often requires a jolt of **norepinephrine / adrenaline (urgency or threat)** to activate executive control and disengage from a loop.
  * **Systematizing, Pattern-Seeking & Rigor (Autism/OCD):** Craves mechanical sense, predictable classification, and absolute mathematical honesty. Ambiguity, fuzzy approximations, or patronizing UX triggers visceral frustration.
* **Perfectionism:**
  * Zero tolerance for sloppy alignment, jittering layouts, broken geometry, or inconsistent rules.
  * Needs high-craft, engineered visual feedback (oscilloscope/bio-telemetry, dark plates, strict monospace).
* **Visual & Kinesthetic Thinker:**
  * Thinks through visual prototyping, direct UI interaction, and concrete artifacts—not abstract walls of theoretical text.
  * During low-energy or headache states, cognitive bandwidth collapses. Output must be structured, high-signal, and formatted in small bullets.

---

## 2. Dopamine Mechanics: The Slot-Machine Loop

### Micro-Reels vs. Long Videos
* **Long-form videos (or longer reels >30s):** Provide a narrative arc or complete stimulus that triggers natural satisfaction/satiation (endorphin/opioid release), enabling a natural pause or exit.
* **Micro-Reels & Quick Skips (<3s):** **The primary addiction engine**.
  * Quick flicking operates on a **variable-ratio schedule of reinforcement** (exact same mechanic as a casino slot machine).
  * Dopamine spikes during **anticipation of reward** ("maybe the next reel is the good one"), *not* consumption.
  * Because the video is skipped before any payoff, the dopamine builds up without resolution, locking the brain into a compulsive, hyper-accelerated hunting loop.

---

## 3. Core Design Principles (Why We Build It This Way)

### 🔴 Urgency & Threat Signals Are Deliberate
* **The Crimson Accent (`#ff2a3b`) and `DRAINED` label are essential tools:**
  * Do NOT soften them, hide them, or turn them into gentle pastels.
  * The user *needs* to see the sharp, clinical reality of time lost to trigger the emergency brake in their brain.
  * *Constraint:* Reserve crimson exclusively for acute threat / worse deltas / vulnerability spikes so it does not degrade into desensitizing background noise.

### 🚫 Anti-Gamification & Zero Moralizing
* **No Streaks, Confetti, or Badges:** Gamification creates anxiety, guilt, and obsession.
* **No Guilt-Tripping or Judgment:**
  * Shaming the user triggers the **"ostrich effect"** (emotional withdrawal → closing the tool → resuming avoidance doom-scrolling).
  * Data must be presented with the cold, objective neutrality of an ICU patient monitor or medical EEG.

### 📏 Mathematical Honesty (OCD Discipline)
* **No Dishonest Comparisons:**
  * Comparing today's live time at 2:00 PM against yesterday's complete 24-hour total is a cognitive lie (showing false green progress).
  * Comparisons must strictly compare against the **same elapsed cutoff** (e.g. `vs yday @ 14:00`).
* **Zero Abbreviations:** Use full platform names (`YouTube`, `Instagram`, `Facebook`) and clean icons. No `CH-` or 2-letter cryptic codes.
* **Monospace Everywhere:** Numbers and readouts must use strict tabular monospace to prevent visual layout jitter during live updates.

---

## 4. Metric Translation Guide

| Telemetry Element | Behavioral Meaning | Visual Rule |
| :--- | :--- | :--- |
| **`DRAINED` (Active Time)** | Acute time loss anchor. | Displays in high-contrast white; flashes/accents in crimson (`#ff2a3b`) on surge. |
| **Quick Skips (`<3s`)** | **Slot Machine Pulls** (compulsive searching loop). | Displayed as count, %, and 10-cell visual strip. Never label as mere "impatience". |
| **Avg Reel Time / Flick** | Distinguishes frantic hunting ($<5\text{s}$) from trance-like consumption ($>40\text{s}$). | Monospace seconds. |
| **Same-Cutoff Delta** | True trajectory relative to yesterday at the exact same minute. | Threat-red if worse, accent-green if better, with visible `@HH:MM` cutoff timestamp. |
| **Vulnerability Windows** | Times of day when resistance collapses (e.g., Graveyard 23:00–06:00). | Circadian/Hourly highlights in threat-red. |

---

## 5. Agent Instructions (How to Work With the User)

1. **Do not lecture or write long essays:** Use small, scannable bullet points, visual wireframe blocks, and direct trade-offs.
2. **Do not remove high-threat visual cues:** If the user asks for high-impact red or urgency styling, support it—it is their neurodivergent break-lever.
3. **Respect layout precision:** Keep containers geometrically balanced (e.g. 50/50 two-column headers, pinned docks, no layout jumping).
4. **Treat quick skipping as dopamine-seeking:** Factor the slot-machine effect into every feature discussing skips or video duration.
