# Scheduled job — Darkon weekly proposal review

The recurring run that executes `../WORKFLOW.md`. Mirrored here on
2026-10-30 so the repo alone can rebuild the automation; if the live
job's instructions change, update this file to match.

## Job definition

| Field | Value |
|---|---|
| Job ID | `darkon-weekly-proposal-review` |
| Title | Darkon weekly proposal review |
| Schedule | Weekly, Saturdays 01:00, timezone America/New_York |
| Owner | the Darkon Senate proposal reviews goal |
| Delivery | None — runs are silent on success (see the instruction text) |

## Instruction text (verbatim, as of 2026-10-30)

Silent weekly Darkon Senate proposal review. RUN SILENTLY: do not send Zachary any chat message when the run succeeds, whether or not new proposals are found. Only surface something to him if the run cannot complete and needs his action (e.g. Discord or GitHub auth rejected, or a step is blocked waiting on him).

Follow ~/workspace/darkon-proposals/WORKFLOW.md end to end. Before using the discord skill, re-read ~/workspace/skills/discord/SKILL.md in case it changed.

Key mechanics:
1. Read ~/workspace/darkon-proposals/state.json. Scan window starts at scan_since_override when set (one-shot: clear it after consuming), otherwise at last_review (the previous scheduled run). First run (last_review null): start at 2026-08-01T00:00:00-04:00.
2. If a Senate scheduled after last_senate has passed (schedule: https://www.darkon.org/index.php/events/ — online, second Saturday of every other month at noon, plus an Election Senate in May), confirm via #agenda-presenting (guild 766364534495117383, channel 1144757403145998467) that it happened and covered proposals; skip specials (e.g. the 2026-09-13 awards-voting special); update last_senate if so.
3. Read #proposal-discussions (channel 1286801164326797385) for messages with timestamp >= window start using ~/workspace/skills/discord/bin/discord. A new proposal is a message containing a docs.google.com/document/d/ link (check content, embeds, attachments). Skip message IDs already in reported.json.
4. For each new doc, spawn a read-only browser task to extract: proposal name, author, exact changes, rationale, and any changes the document EXPLICITLY calls out as "line items" to vote on. Line items exist only when the document itself designates them — never infer them from separable structure. Never edit or comment on docs.
5. Refresh in-flight proposals: for each tracked proposal at "To Present" or "Up for Vote", re-read its document the same read-only way; if its substance changed (changes, rationale, title, designated line items), update the JSON summary bullets (and name/line_items when changed), regenerate its easypoll_blocks, update the summary in its GitHub issue body to match, and append a field_update event to history.json. Do not refresh proposals at "Passed Senate/Playtest" or beyond.
6. Write one JSON per new proposal to proposals/<id>.json per proposals/SCHEMA.md (author and poster stored separately; status is the lifecycle field). Status values are exactly the GitHub Project 2 "Darkon Proposal Tracker" Status options: "To Present", "Up for Vote", "Passed Senate/Playtest", "Passed BOD", "Recorded on #passed-and-pending", "Withdraw/Fail". New proposals start as "To Present"; the only automated forward move is "To Present" -> "Up for Vote" when the proposal appears on #agenda-presenting. For each new proposal, also create a GitHub issue in zrandrews-achesmakes/darkonPropTracker (title = proposal name; snapshot-style body: Proposal ID, Author, Status, Vote results, Senate dates, line items, Discord post, proposal document, summary bullets), add it to Project 2, set its Status to "To Present", and record the issue link in the JSON's github_issue_url — every proposal is an issue/card on Project 2 from creation. The two forks (Up for Vote -> Passed Senate/Playtest or Withdraw/Fail; Passed Senate/Playtest -> Passed BOD or Withdraw/Fail) are manual moves only, made on Zachary's confirmed vote/BOD outcomes — never infer them. Decisions are recorded by appending to the proposal's vote_result array (a list that can hold more than one value; empty when nothing decided yet): "passed_senate", "failed_senate", "passed_bod", "failed_bod", "withdrawn". Generate easypoll_blocks per poll-format.json: each block starts with "/poll " (trailing space) then the question "<Proposal name> by <Author>" on the same line; text holds author, post link, and doc link ONLY — no summary block inside poll blocks; answers exactly Yes / No / Abstain; one block per line item ONLY when the document explicitly designates line-item votes, otherwise a single all-or-nothing block for the whole proposal.
7. Append handled message IDs to reported.json; append created events to history.json; set state.json last_review to now (ISO 8601 with offset) and last_review_result ("N new proposals" or "none"); clear scan_since_override if consumed.
8. Push everything: ~/workspace/skills/github/bin/gh-sync --repo zrandrews-achesmakes/darkonPropTracker --dir ~/workspace/darkon-proposals --message "weekly proposal review"
9. Never move a proposal out of "Recorded on #passed-and-pending" or "Withdraw/Fail" — our scope ends at either status. Leave proposals/darkon-bot-test-prop.json alone (marked test record).

When finished with no errors, end silently with no user-facing message.
