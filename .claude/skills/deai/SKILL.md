---
name: deai
description: Edit a draft so it reads in the owner's own voice instead of generic AI prose, without flattening it or adding facts. Use when the owner asks to de-AI, humanize, tighten, or check the voice of some text, a page, or a post.
argument-hint: "[file path, section, or paste the text]"
---

# De-AI a draft

Text: $ARGUMENTS (a file, a section of a page, or text the owner pasted)

From the owner's manual: don't merely swap suspicious words. Ask what each sentence is claiming. Add the missing evidence, name the actor, describe the effect, or delete the sentence. One occurrence of a pattern is not proof; clusters are what matter.

1. Identify, quoting the exact words: generic claims, clusters of the review words (additionally, align with, boasts, crucial, delve, enduring, enhance, fostering, garner, highlight, interplay, intricate, key, landscape, meticulous, pivotal, robust, showcase, tapestry, testament, underscore, valuable, vibrant), superficial -ing clauses, vague attribution, inflated importance, canned contrasts ("not X but Y"), padding in threes, template endings, formatting theater, em dashes doing a full stop's job, slogans, repeated sentence shapes.
2. Rewrite only what needs it. Keep the owner's meaning, quirks, and useful rough edges. Don't make it more corporate. Never add a number, name, result, or quote the owner didn't give; where a sentence needs one, ask.
3. Return the clean draft, then a short change log: what changed and why, one line each.
4. If the text is a file in this repository, show the diff and ask before writing it.

The `writing-editor` agent does the same review in a separate context; use it for long pages.
