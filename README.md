# Darkon Proposal Tracker

https://zrandrews-achesmakes.github.io/darkonPropTracker/

Tracks rule proposals from the Darkon Crownlands Community Discord
(`#proposal-discussions`), summarized and ready to turn into EasyPoll
`/poll` blocks for Senate votes.

## Layout

- `WORKFLOW.md` — the recurring review workflow: how proposals are found,
  read, summarized, recorded, and pushed.
- `proposals/` — one JSON record per proposal (`SCHEMA.md` documents the
  fields). `status` is the authoritative lifecycle field; `easypoll_blocks`
  holds ready-to-paste `/poll` blocks (one per votable line item).
- `poll-format.json` — the EasyPoll block format: fields, exact Yes / No /
  Abstain options, line-item rule.
- `history.json` — audit trail of proposal events.
- `reported.json` — Discord message IDs already processed (not re-reported).
- `pipeline/` — **rebuild kit**: portable copies of the Discord reader and
  GitHub sync tools plus a guide to reconstruct the whole process on any AI
  tool or a new Muse account. Start at `pipeline/README.md`.

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
