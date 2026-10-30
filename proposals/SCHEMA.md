# Proposal tracking schema

One JSON file per proposal in this directory, named `<id>.json`.

## Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | URL-safe slug, unique per proposal. |
| `name` | string | Proposal title. |
| `author` | string | Proposal author (Discord display name). |
| `posted_by` | string | Who posted it in #proposal-discussions (may differ from author). |
| `posted_by_username` | string | Their Discord username. |
| `posted_at` | string | ISO-8601 timestamp of the Discord post. |
| `discord_post_url` | string | Link to the Discord message. |
| `doc_url` | string | Link to the Google Doc (verbatim as posted). |
| `summary` | string[] | Up to 5 bullet points summarizing the proposal. |
| `easypoll_blocks` | string[] | Copy-paste EasyPoll `/poll` blocks per `poll-format.json`, one per line item (or a single block for the whole proposal). Empty when no vote applies (e.g. test records). |
| `line_items` | string[] | Separable items needing their own vote, if any. |
| `status` | string | Lifecycle stage. Must be exactly one of the Status options on the GitHub Project **Darkon Proposal Tracker** (Project 2, see below) — verbatim, case-sensitive. |
| `presented_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was discussed at. |
| `voted_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was voted at. |
| `vote_result` | string[] | The recorded decision outcomes — **a list that can hold more than one value** (see "vote_result values" below). Empty list `[]` when nothing has been decided yet. Outcomes live here, not in `status`. |
| `notes` | string | Anything else (poll context, renames, outcome sources, withdrawals, etc.). |

## Status options

These match the Status field on
https://github.com/users/zrandrews-achesmakes/projects/2
(project ID `PVT_kwHOE7xLmc4BmfHq`, Status field ID
`PVTSSF_lAHOE7xLmc4BmfHqzhlH9tQ`), verified live on 2026-10-30.
Use the option name verbatim as the JSON `status` value.

The first four names also match the statuses the Darkon BOD uses on its
own board (adopted at Zachary's direction on 2026-10-30: New Proposals →
To Present, Discussed in Senate → Up for Vote, Voted in Senate → Passed
Senate/Playtest, Approved by BOD → Passed BOD). Our workflow **ends at
`Recorded on #passed-and-pending` or `Done`** — the BOD board's later
stages (`Pending Publication`, `Rulebook Published`) and its
`Withdraw/Fail` stage are not used here; a proposal that is written into
the rulebook or withdrawn both close as `Done`, with the detail in
`vote_result` / `notes`.

| # | Status value | Option ID | Meaning |
|---|---|---|---|
| 1 | `To Present` | `e31064a4` | Posted, not yet presented / discussed at a Senate. |
| 2 | `Up for Vote` | `ac134f43` | Discussed at a Senate, awaiting a vote. |
| 3 | `Passed Senate/Playtest` | `a8eef09e` | Passed by the Senate (or approved for playtest), pending BOD approval. See `vote_result` for the outcome. |
| 4 | `Passed BOD` | `3ca57afe` | Passed in Senate and approved by the BOD. |
| 5 | `Recorded on #passed-and-pending` | `d8219fdd` | Approved by BOD and posted on the Discord #passed-and-pending channel. End of our workflow for passed proposals. |
| 6 | `Done` | `1de02fe0` | Closed out (written to the rulebook, or withdrawn). Terminal: no automated run may move a `Done` proposal to another status. It changes only on an explicit manual change by Zachary. |

## vote_result values

Created 2026-10-30 at Zachary's direction. `vote_result` is an array;
append a value each time one of these decisions happens, in the order
they happen. A proposal that passes both bodies holds e.g.
`["passed_senate", "passed_bod"]`.

| Value | Recorded when |
|---|---|
| `passed_senate` | The Senate vote passes (Fork 1, pass branch). |
| `failed_senate` | The Senate vote fails (Fork 1 → `Done`). |
| `passed_bod` | The BOD approves the proposal (Fork 2, approve branch). |
| `failed_bod` | The BOD rejects the proposal (Fork 2 → `Done`). |
| `withdrawn` | The proposal is withdrawn at any point (closes as `Done`). |

These replaced the old single-value scheme (`passed` / `failed` /
`unknown` / null) on 2026-10-30; all existing records were backfilled
and the conversions logged as `field_update` events in `history.json`.

## Transitions — the two forks

```
To Present ──→ Up for Vote ──┬──→ Passed Senate/Playtest ──┬──→ Passed BOD ──→ Recorded on #passed-and-pending
                             └──→ Done                     └──→ Done
```

- **Fork 1 — `Up for Vote`:** the Senate vote decides. Pass → `Passed
  Senate/Playtest` (append `passed_senate` to `vote_result`, set
  `voted_at_senate`). Fail → `Done` (append `failed_senate`).
  Withdrawn → `Done` (append `withdrawn`).
- **Fork 2 — `Passed Senate/Playtest`:** → `Passed BOD` when the BOD
  approves it (append `passed_bod`), or → `Done` if the BOD rejects
  it (append `failed_bod`) or it otherwise closes without BOD
  approval (detail in `notes`).
- `Passed BOD` → `Recorded on #passed-and-pending` when it is posted
  on that Discord channel.
- **End of our scope: `Recorded on #passed-and-pending` and `Done`.**
  Our workflow stops at either one — no automated run moves a proposal
  out of either state, and later BOD-board stages (Pending
  Publication, Rulebook Published) are not tracked here.
- The only *automated* forward move is still `To Present` → `Up for
  Vote` (when a proposal appears on #agenda-presenting). Every fork
  move is manual, because vote and BOD outcomes only enter the tracker
  from Zachary's explicit confirmation.
