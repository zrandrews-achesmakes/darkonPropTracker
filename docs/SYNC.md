# Proposal board sync contract

This file describes the proposed sync to the existing GitHub Project. It does not change the Project itself.

## Workflow status mapping

| Repository `status` | GitHub Project Status |
|---|---|
| `new` | New Proposals |
| `presented` | Discussed in Senate |
| `voted` | Voted in Senate |
| `approved_by_bod` | Approved by BOD |
| `recorded` | Recorded on #passed-and-pending |
| `done` | Done |
| `canceled` | Done, retaining the canceled status and notes in the repo |

A playtest proposal uses repository status `approved_by_bod` and the `Playtest` tag. Senate passage alone does not imply BOD approval.

## Outcome tags

The `tags` array holds `Passed`, `Failed`, `Playtest`, and `Withdrawn` independently of workflow status.

- `Passed` or `Failed` records the known Senate outcome; keep board Status at Voted in Senate until the proposal advances to a later stage.
- `Playtest` marks an approved playtest and maps the board Status to Approved by BOD.
- `Withdrawn` maps the board Status to Done.
- A withdrawn proposal is not the same as a canceled proposal. Canceled records remain sticky and must not be automatically reopened.
- `Scheduled` is not a repo status or tag. Do not create a Scheduled board status; retain relevant agenda context in notes until a vote occurs.

## Card fields

Keep one card per proposal and match cards by the stable repository `id`.

| Card field | Repository source |
|---|---|
| Proposal ID | `id` |
| Author | `author` |
| Discord post | `discord_post_url` |
| Proposal document | `doc_url` |
| Vote result | `vote_result` |
| Presented at Senate | `presented_at_senate` |
| Voted at Senate | `voted_at_senate` |
| Summary | `summary` |
| Line items | `line_items` |
| Tags | `tags` |

Use the existing Priority field only for prioritization. Keep existing board columns, descriptions, limits, views, and workflows unchanged. Do not infer BOD approval or Discord recording from a Passed tag.

## Sync behavior

- Create a card when no matching Proposal ID exists; otherwise update that card in place.
- Do not match on title alone or create duplicates for title changes.
- Preview proposed creates, updates, unmapped statuses, and conflicts before writing.
- Leave unknown statuses, duplicate IDs, or contradictory data for human review.
- Treat repository `status` as the source for the board's Status field and `tags` as additive outcome markers.
