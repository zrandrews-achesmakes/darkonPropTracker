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
| `vote_result` | string \| null | `passed`, `failed`, `unknown`, or null if not yet voted. The vote *outcome* lives here, not in `status`. |
| `notes` | string | Anything else (poll context, renames, outcome sources, withdrawals, etc.). |

## Status options

These match the Status field on
https://github.com/users/zrandrews-achesmakes/projects/2
(project ID `PVT_kwHOE7xLmc4BmfHq`, Status field ID
`PVTSSF_lAHOE7xLmc4BmfHqzhlH9tQ`), verified live on 2026-10-30.
Use the option name verbatim as the JSON `status` value.

| # | Status value | Option ID | Meaning |
|---|---|---|---|
| 1 | `New Proposals` | `f75ad846` | Posted, not yet discussed at a Senate. |
| 2 | `Discussed in Senate` | `61e4505c` | Discussed / presented at a Senate, awaiting a vote. |
| 3 | `Voted in Senate` | `47fc9ee4` | A Senate vote has happened; see `vote_result` for the outcome. |
| 4 | `Approved by BOD` | `df73e18b` | Approved by the Board of Directors after the Senate vote. |
| 5 | `Recorded on #passed-and-pending` | `98c13ac4` | Recorded on the Discord #passed-and-pending channel. |
| 6 | `Done` | `98236657` | Closed out. Terminal: no automated run may move a `Done` proposal to another status. It changes only on an explicit manual change by Zachary. |

Withdrawn, canceled, failed, and playtest outcomes are **not** statuses
under this scheme (they were, before the 2026-10-30 migration to the
Project 2 options). Record them in `vote_result` and/or `notes`, and
close the proposal as `Done` when it is finished.
