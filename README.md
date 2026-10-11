# Darkon Proposal Tracker

Tracks rule proposals from the Darkon Crownlands Community Discord
(`#proposal-discussions`), summarized and ready to turn into EasyPoll
`/poll` blocks for Senate votes.

## Layout

- `WORKFLOW.md` — the recurring review workflow: how proposals are found,
  read, summarized, recorded, and pushed.
- `proposals/` — one JSON record per proposal (`SCHEMA.md` documents the
  fields). `status` is the authoritative workflow-stage field; `tags`
  record outcome/context labels; `easypoll_blocks` holds ready-to-paste
  `/poll` blocks (one per votable line item).
- `poll-format.json` — the EasyPoll block format: fields, exact Yes / No /
  Abstain options, line-item rule.
- `history.json` — audit trail of proposal events.
- `reported.json` — Discord message IDs already processed (not re-reported).
- `docs/SYNC.md` — proposed mapping to the existing GitHub Project.
- `pipeline/` — rebuild kit: portable copies of the Discord reader and
  GitHub sync tools plus a guide to reconstruct the process on another AI
  tool or Muse account. Start at `pipeline/README.md`.

## Status and tags

Workflow statuses are `new`, `presented`, `voted`, `approved_by_bod`,
`recorded`, `done`, and `canceled`. `Scheduled` is not a repo status.
Outcome tags are `Passed`, `Failed`, `Playtest`, and `Withdrawn`.
Playtest proposals use status `approved_by_bod` and the `Playtest` tag;
withdrawn proposals use status `done` and the `Withdrawn` tag. See
`proposals/SCHEMA.md` for definitions.

## Data consumers

The public Darkon Proposals board reads this repo live (no auth needed —
it's public). Raw file URLs look like:

```
https://raw.githubusercontent.com/zrandrews-achesmakes/darkonPropTracker/main/proposals/<id>.json
```

To enumerate proposal files, use the repo tree:

```
https://api.github.com/repos/zrandrews-achesmakes/darkonPropTracker/git/trees/main?recursive=1
```
