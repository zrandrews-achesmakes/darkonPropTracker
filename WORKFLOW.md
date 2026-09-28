# Darkon Proposal Tracker — Workflow

Recurring job: surface new rule proposals from the Darkon Crownlands Community
Discord since the last Senate session, summarized and ready to poll.

## Channel IDs (Darkon Crownlands Community)
- Guild: `766364534495117383`
- #agenda-presenting: `1144757403145998467`
- #proposal-discussions: `1286801164326797385`
(If these ever stop working, re-resolve with `discord resolve --guild 766364534495117383 --name <channel>`.)

## Steps
1. **Last Senate.** Read `state.json` for `last_senate` (currently
   2026-08-08). Cross-check against the public schedule at
   https://www.darkon.org/index.php/events/ (Senate meets online on the
   Darkon Discord, second Saturday of every other month at noon, plus an
   Election Senate in May). If a scheduled Senate newer than `last_senate`
   has passed, read #agenda-presenting
   (`discord read --channel 1144757403145998467 --all --chronological`) to
   confirm it happened and covered proposals — skip special sessions with
   no props (e.g. the 2026-09-13 awards-voting special) — and update
   `last_senate` in `state.json`.
   **Status transitions.** Whenever #agenda-presenting is read (step 1, or
   any manual check), cross-reference existing proposals: any proposal with
   status `new` that appears as presented at a Senate moves to `presented`
   — set `presented_at_senate` to that Senate's date and append a
   `status_change` event to `history.json` (actor: `workflow`). This is the
   only automated forward transition besides creation; votes and outcomes
   still require explicit confirmation.
2. **Scan window.** Start at `scan_since_override` in `state.json` when
   Zachary has set one (one-shot: clear it after the run consumes it);
   otherwise start at `last_review` (the previous scheduled run). On the
   very first run (`last_review` null), start at 2026-08-01. Read
   #proposal-discussions messages with timestamp >= window start.
   `reported.json` dedupes anything already seen. A new proposal is a
   message containing a `docs.google.com/document/d/` link — check message
   content, embeds, and attachments. Skip any message ID already listed in
   `reported.json`.
3. **Read each doc.** `browser.open` cannot render Google Docs, so spawn a
   browser task (read-only) per document and ask it to return: the proposal's
   name, exactly what it changes (old vs new wording where given), the
   author's stated rationale, and — importantly — whether the document
   contains multiple distinct **line items** that would each need their own
   vote (some proposals bundle several separable changes; e.g. a line-item
   vote). Never edit or comment on the docs.
4. **Summarize.** Per proposal, produce: author (Discord display name), a link
   to the Discord post
   (`https://discord.com/channels/766364534495117383/1286801164326797385/<message_id>`),
   the proposal name, and up to 5 bullet points. If the document has
   votable line items, call them out explicitly after the bullets so it's
   clear the proposal may need one poll per line item rather than a single
   poll.
5. **Poll block.** Format each proposal per `poll-format.json` as a
   copy-paste block for Discord's `/poll` command. Each block starts with
   `/poll ` (trailing space) followed by the question on the same line.
   If the proposal has distinct line items, produce one poll block per
   line item (question names the line item); otherwise a single poll block
   for the whole proposal:
   - `question`: "<Proposal name> by <Author>"
   - `text`: author, post link, doc link, then the bullet summary (this text
     appears above the poll).
   - `answer-1`: "Yes"
   - `answer-2`: "No"
   - `answer-3`: "Abstain"
   Tell the user to type `/poll` in Discord and paste each value into the
   matching field.
6. **Record.** Append handled message IDs to `reported.json` so future runs
   only surface genuinely new proposals. Also write one JSON tracking form
   per new proposal to `proposals/<id>.json`, following `proposals/SCHEMA.md`
   (author, poster, timestamps, post + doc links, summary bullets, line
   items, status, Senate dates, vote result, notes). Generate its
   `easypoll_blocks` from `poll-format.json` and store them in the JSON.
   Append a `created` event to `history.json`; append a `status_change`
   event every time a proposal's status moves (actor: who made the change).
   Update `state.json`: set `last_review` to the run timestamp (ISO 8601
   with timezone offset) and `last_review_result` to e.g.
   `2 new proposals` or `none`; clear `scan_since_override` if one was
   consumed.
   Then push everything to GitHub:
   `~/workspace/skills/github/bin/gh-sync --repo zrandrews-achesmakes/darkonPropTracker --dir ~/workspace/darkon-proposals`.
   GitHub is the home for these files (the old Google Drive folder is
   deprecated); never leave the repo behind the local copies.
7. **Never resurrect.** If a proposal's JSON has status `canceled`, leave it
   alone: no automated run may move it to another status. It changes only on
   Zachary's explicit manual instruction.
7. **Report.** Deliver the summaries + poll blocks to the user. If nothing new
   was found, say so briefly and stay quiet otherwise.

## Auth
- Discord: the `discord` skill; credential in Secure Vault as `custom.discord`
  (read-only bot).
- Google Docs: live browser task, read-only. If a CAPTCHA appears, pause and
  ask the user instead of solving.

## State
- `state.json` — `last_senate` (date + schedule source), `last_review`
  timestamp and result, optional one-shot `scan_since_override`.
- `reported.json` — message IDs already surfaced (do not re-report).
- `poll-format.json` — the EasyPoll `/poll` format: fields, vote options, line-item rule.
- `history.json` — audit trail of proposal events (`created`, `baseline`, `status_change`, `field_update`).
- Phase 2 (pending user approval of this workflow's output): per-proposal
  `.json` tracking forms + a web app to display and update their statuses.
