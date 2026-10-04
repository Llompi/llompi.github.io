---
name: writeup
description: Turn a piece of the owner's work into a publishable write-up at the right disclosure level, following the owner's seven-pass AI workflow so the owner chooses the direction and writes the parts only they can. Use only when the owner asks to write up, document, or publish a project or case study.
argument-hint: "[what the write-up is about]"
disable-model-invocation: true
---

# Write-up

Subject: $ARGUMENTS

This follows the owner's working manual. The model widens the options and does the mechanical work; the owner picks the problem, the standard, the tradeoffs, and the final words. Don't skip a pass, and don't pick for the owner.

## 1. Frame (ask, then wait)

Ask, in one message, short enough for a phone:

- Who is it for, and what should they understand or do after reading?
- Whose work is it? Personal, employer, sponsor, or a home project in the employer's field?
- Which facts, numbers, photos, and outcomes can be used? (The owner gives these. Never fill a gap with a plausible number.)
- What must not appear?

Then set the disclosure level from PUBLISHING.md: open, generalized, keep-out, or not at all. A home project in the employer's field is "not at all" unless the owner has written clearance; say so and stop if that applies.

## 2. Expose gaps

List what is ambiguous, missing, or unverifiable before drafting. Ask only the questions that would change the piece.

## 3. Diverge

Offer two or three different directions in a few lines each, for example the method, the failure that taught something, or the decision and its tradeoff. For each: what it shows, what it gives up, and how it could go wrong (including exposure risk).

## 4. Choose

Wait for the owner's pick and their reason. Use that reason as the standard for the review in pass 6.

## 5. Execute

Draft into `writeup/<slug>/index.html`, copying the structure of `writeup/secure-agent-deployment/index.html` (header, nav, article layout, footer). Lead with the point, use concrete nouns and verbs, and stop at the real ending. Where a sentence needs a fact you don't have, write the question for the owner in your summary rather than a placeholder in the page.

Add the page to `sitemap.xml` and a card to the Work section only if the owner wants it listed.

## 6. Attack

Run `/inspect writeup/<slug>/` and the `writing-editor` agent on the draft. Run `node tools/disclosure-check.mjs`. Fix what the owner agrees to fix.

## 7. Own

Hand it back with a list of the sentences that most need the owner's own words, usually the opening, any claim about their judgment, and the ending. Publishing waits until the owner has read it end to end and says it's theirs.
