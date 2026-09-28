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
| `status` | string | Lifecycle: `new`, `presented`, `scheduled`, `voted`, `passed`, `failed`, `playtest`, `withdrawn`, `canceled`. |
| `presented_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was discussed at. |
| `voted_at_senate` | string \| null | Date (YYYY-MM-DD) of the Senate it was voted at. |
| `vote_result` | string \| null | `passed`, `failed`, `unknown`, or null if not yet voted. |
| `notes` | string | Anything else (poll context, renames, outcome sources). |

## Status meanings

- `new` — posted, not yet on a Senate agenda.
- `presented` — discussed at a Senate, awaiting a vote.
- `scheduled` — on an upcoming agenda for a vote.
- `voted` — a vote happened; see `vote_result` (`unknown` when the outcome wasn't recorded).
- `passed` / `failed` — voted with a known outcome.
- `playtest` — approved for playtesting.
- `withdrawn` — pulled by the author.
- `canceled` — killed or superseded. Sticky: once a proposal is `canceled`, no
  automated run may move it to another status. It changes only on an explicit
  manual status change.
