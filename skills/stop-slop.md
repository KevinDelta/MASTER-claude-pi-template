---
name: stop-slop
description: Strip AI writing patterns from prose. Load when writing or reviewing any human-facing text — reports, proposals, emails, briefs, documentation, social copy.
---

# stop-slop

## Purpose

Strip AI writing patterns from prose. The output should read like a person wrote it — someone who knows the subject well and has something specific to say. Not like a language model completing a paragraph.

## When to Use

Load this skill whenever writing or reviewing prose output: reports, proposals, email drafts, social content, documentation, briefs, summaries. Any text a human will read.

Do not apply to code, data tables, or structured formats where plain language doesn't apply.

---

## The Patterns to Kill

### Hollow openers

These phrases say nothing and burn the reader's patience:

- "In today's fast-paced world..."
- "It's important to note that..."
- "It is worth mentioning..."
- "When it comes to..."
- "In the realm of..."
- "In the context of..."
- "As we navigate..."
- "In conclusion..."
- "To summarize..."

**Fix:** Cut the opener entirely. Start with the actual point.

---

### Vague superlatives

These claim significance without providing any:

- "comprehensive," "robust," "cutting-edge," "state-of-the-art"
- "innovative," "revolutionary," "transformative," "game-changing"
- "powerful," "advanced," "best-in-class," "world-class"
- "seamlessly," "effortlessly," "efficiently" (when no metric follows)

**Fix:** Replace with what actually makes it good. "Comprehensive" → "covers all six job types including edge cases." "Powerful" → "processes 500 estimates per hour without queuing."

---

### Padding transitions

Transitions that add words without adding structure:

- "Furthermore," "Moreover," "Additionally," "In addition,"
- "It should be noted that," "It goes without saying that"
- "Needless to say," "Of course,"
- "Moving on," "With that said," "Having said that"

**Fix:** Cut them. If the next sentence needs a connector, use "Also" or restructure so it doesn't.

---

### Passive voice stacking

Passive voice is acceptable in small doses. Multiple consecutive passive sentences read like bureaucratic prose.

- "The report was generated..." "The findings were reviewed..." "The decision was made..."
- Any sentence where the actor is absent and would make it clearer

**Fix:** Name who did the thing. "The system generated the report" or "Kevin reviewed the findings."

---

### Summary bloat at the end

Restating what was just said as if the reader forgot:

- "In summary, we have explored..."
- "As we have seen, [restatement of entire piece]..."
- "This demonstrates that..."

**Fix:** End on the last real point. Don't recap what the reader just read.

---

### Hedging clusters

One hedge is fine. Three hedges in a sentence is a red flag:

- "It may be possible that in some cases..."
- "Generally speaking, it is often the case that..."
- "While it can sometimes depend on various factors..."

**Fix:** Pick the hedge that's actually needed. Drop the rest.

---

### List inflation

Bullet lists that should be sentences, or lists padded to seem thorough:

- A list of two items doesn't need bullets
- A list where every item is a single generic word ("efficiency," "quality," "collaboration")
- Lists where all bullets have the same construction: "Ensuring...", "Ensuring...", "Ensuring..."

**Fix:** If it doesn't need to be scanned independently, make it a sentence. If the list items are substantive, vary the construction.

---

## Process

1. Read the full piece before editing anything
2. Mark every instance of the patterns above
3. Fix in order: openers first, then superlatives, then transitions, then passive, then endings
4. Read it aloud after editing — if it sounds like a corporate memo, there's more to cut
5. Final check: does every sentence do something the previous sentence didn't?

---

## Standards

**Every sentence earns its place.** If removing it loses nothing, remove it.

**Specificity over claims.** Never assert quality — demonstrate it with a number, example, or detail.

**Active voice by default.** Passive is allowed when the actor genuinely doesn't matter. Not as a default.

**Shorter is almost always better.** Cut until cutting would lose meaning.

---

## Before / After Examples

**Before:**
> In today's competitive landscape, it's important to note that our comprehensive solution offers robust capabilities that seamlessly integrate with your existing workflows, driving transformative outcomes for organizations of all sizes.

**After:**
> The system connects to ServiceTitan and Jobber via webhook. Setup takes under two hours.

---

**Before:**
> Furthermore, the report was generated using data from the past 30 days. It should be noted that the findings were reviewed by the team. In conclusion, the results demonstrate strong performance across all key metrics.

**After:**
> The report covers the past 30 days. The team reviewed the findings. Margin held above target on 8 of 9 job types.
