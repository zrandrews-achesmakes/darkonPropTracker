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
| `github_issue_url` | string \| null | Link to the proposal's GitHub issue in `zrandrews-achesmakes/darkonPropTracker`. Set at creation: every proposal gets an issue there, added as a card on Project 2 at `To Present`, and the link is recorded here. |
| `summary` | string[] | Up to 5 bullet points summarizing the proposal. |
| `easypoll_blocks` | string[] | Copy-paste EasyPoll `/poll` blocks per `poll-format.json`, one per line item (or a single block for the whole proposal). Empty when no vote applies (e.g. test records). |
| `line_items` | string[] | Items the document itself explicitly calls out as "line items" to vote on separately, if any (Zachary's 2026-10-30 rule: never infer them from separable structure; when the document designates none, this is empty and the poll is a single all-or-nothing block). |
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

Five of the names match the statuses the Darkon BOD uses on its own
board (adopted at Zachary's direction on 2026-10-30: New Proposals →
To Present, Discussed in Senate → Up for Vote, Voted in Senate → Passed
Senate/Playtest, Approved by BOD → Passed BOD, and `Done` renamed to
`Withdraw/Fail` later the same day). Our workflow **ends at
`Recorded on #passed-and-pending` or `Withdraw/Fail`** — the BOD
board's later stages (`Pending Publication`, `Rulebook Published`) are
not used here; a proposal that fails or is withdrawn closes as
`Withdraw/Fail`, with the detail in `vote_result` / `notes`.

| # | Status value | Option ID | Meaning |
|---|---|---|---|
| 1 | `To Present` | `1cd71177` | Posted, not yet presented / discussed at a Senate. |
| 2 | `Up for Vote` | `b9e5995a` | Discussed at a Senate, awaiting a vote. |
| 3 | `Passed Senate/Playtest` | `0c28d581` | Passed by the Senate (or approved for playtest), pending BOD approval. See `vote_result` for the outcome. |
| 4 | `Passed BOD` | `d999f782` | Passed in Senate and approved by the BOD. |
| 5 | `Recorded on #passed-and-pending` | `982aad20` | Approved by BOD and posted on the Discord #passed-and-pending channel. End of our workflow for passed proposals. |
| 6 | `Withdraw/Fail` | `ce3191df` | Closed out without taking effect — withdrawn, failed a Senate vote, or rejected by the BOD (detail in `vote_result`). Terminal: no automated run may move a `Withdraw/Fail` proposal to another status. It changes only on an explicit manual change by Zachary. (Named `Done` until the 2026-10-30 rename.) |

## vote_result values

Created 2026-10-30 at Zachary's direction. `vote_result` is an array;
append a value each time one of these decisions happens, in the order
they happen. A proposal that passes both bodies holds e.g.
`["passed_senate", "passed_bod"]`.

| Value | Recorded when |
|---|---|
| `passed_senate` | The Senate vote passes (Fork 1, pass branch). |
| `failed_senate` | The Senate vote fails (Fork 1 → `Withdraw/Fail`). |
| `passed_bod` | The BOD approves the proposal (Fork 2, approve branch). |
| `failed_bod` | The BOD rejects the proposal (Fork 2 → `Withdraw/Fail`). |
| `withdrawn` | The proposal is withdrawn at any point (closes as `Withdraw/Fail`). |

These replaced the old single-value scheme (`passed` / `failed` /
`unknown` / null) on 2026-10-30; all existing records were backfilled
and the conversions logged as `field_update` events in `history.json`.

## Transitions — the two forks

```
To Present ──→ Up for Vote ──┬──→ Passed Senate/Playtest ──┬──→ Passed BOD ──→ Recorded on #passed-and-pending
                             └──→ Withdraw/Fail            └──→ Withdraw/Fail
```

- **Fork 1 — `Up for Vote`:** the Senate vote decides. Pass → `Passed
  Senate/Playtest` (append `passed_senate` to `vote_result`, set
  `voted_at_senate`). Fail → `Withdraw/Fail` (append `failed_senate`).
  Withdrawn → `Withdraw/Fail` (append `withdrawn`).
- **Fork 2 — `Passed Senate/Playtest`:** → `Passed BOD` when the BOD
  approves it (append `passed_bod`), or → `Withdraw/Fail` if the BOD rejects
  it (append `failed_bod`) or it otherwise closes without BOD
  approval (detail in `notes`).
- `Passed BOD` → `Recorded on #passed-and-pending` when it is posted
  on that Discord channel.
- **End of our scope: `Recorded on #passed-and-pending` and `Withdraw/Fail`.**
  Our workflow stops at either one — no automated run moves a proposal
  out of either state, and later BOD-board stages (Pending
  Publication, Rulebook Published) are not tracked here.
- The only *automated* forward move is still `To Present` → `Up for
  Vote` (when a proposal appears on #agenda-presenting). Every fork
  move is manual, because vote and BOD outcomes only enter the tracker
  from Zachary's explicit confirmation.
- **Every proposal is a GitHub issue from creation:** creating a
  proposal also creates an issue in the `darkonPropTracker` repo and
  adds it as a card on Project 2 at `To Present` (see WORKFLOW Step
  6a); the link is recorded in `github_issue_url`. Status moves after
  that change the card's Status only — there is nothing to convert.
  (As of 2026-10-30 all ten real proposals are issues #1–#10 on
  Project 2; the marked test record has no issue.)
