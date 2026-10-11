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
| `status` | string | Workflow stage: `new`, `presented`, `voted`, `approved_by_bod`, `recorded`, `done`, or `canceled`. |
| `tags` | string[] | Outcome tags: `Passed`, `Failed`, `Playtest`, and/or `Withdrawn`. Empty when none apply. |
| `presented_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was discussed at. |
| `voted_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was voted at. |
| `vote_result` | string \| null | `passed`, `failed`, `unknown`, or null if not yet voted. |
| `notes` | string | Anything else (poll context, renames, outcome sources). |

## Status meanings

- `new` — posted, not yet on a Senate agenda.
- `presented` — discussed at a Senate, awaiting a vote.
- `voted` — a Senate vote happened; see `vote_result` (`unknown` when the outcome wasn't recorded). Add `Passed` or `Failed` to `tags` for a known outcome.
- `approved_by_bod` — approved by the Board of Directors. Playtest proposals use this status and carry the `Playtest` tag.
- `recorded` — approved proposal recorded on `#passed-and-pending`.
- `done` — written to the rulebook or withdrawn; withdrawn proposals carry the `Withdrawn` tag.
- `canceled` — killed or superseded. Sticky: once a proposal is `canceled`, no automated run may move it to another status. It changes only on an explicit manual status change.

`Scheduled` is not a repository status or tag. Track a planned vote in notes or agenda context until the Senate vote occurs. Tags are additive and do not replace workflow status.
