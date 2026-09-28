# Rebuilding the Darkon proposal pipeline

Everything needed to reconstruct this workflow on any AI tool — or a fresh
Muse account — lives in this repo. No step requires the original machine.

## What the pipeline does

1. A read-only Discord bot reads the Darkon Crownlands Community server:
   `#agenda-presenting` identifies the last Senate that handled proposals,
   then `#proposal-discussions` is scanned for new proposal posts (each one
   links a Google Doc).
2. Each linked doc is read and summarized: author, Discord post link,
   proposal name, up to 5 bullets, and any separable line items.
3. One JSON record per proposal is written to `proposals/<id>.json`
   (see `proposals/SCHEMA.md`), EasyPoll `/poll` blocks are generated from
   `poll-format.json`, and audit events go to `history.json`.
4. Everything is pushed back to this repo, which doubles as the data source
   for the public proposals board.

The full step-by-step is in `../WORKFLOW.md`.

## What's in `pipeline/skills/`

| Path | What it is |
|---|---|
| `skills/auth.py` | Shared credential helper for both CLIs. |
| `skills/discord/bin/discord` | Read-only Discord REST CLI (guilds, channels, resolve, read). |
| `skills/discord/SKILL.md` | Usage and operating rules for the Discord reader. |
| `skills/github/bin/gh-sync` | Pushes a local directory to a GitHub repo via the Contents API (no SSH needed). |
| `skills/github/SKILL.md` | Usage notes for the sync tool. |

Both CLIs are pure Python 3 stdlib. The **only** platform-specific seam is
credential injection, handled by `auth.py`:

1. On a Muse account it uses the Secure Vault entries `custom.discord` and
   `custom.github` automatically (no code changes).
2. Anywhere else it falls back to environment variables — no code changes.

## Credentials you must supply

Neither credential is in this repo (by design). You need:

- **Discord bot token** — create an application and bot in the Discord
  Developer Portal, enable the **Message Content Intent**, invite the bot to
  your server. The token is sent with the `Bot ` prefix (added automatically
  if you omit it).
- **GitHub fine-grained PAT** — scoped to this repo, **Contents: Read and
  write**. Used only for pushing; reads of this public repo need no auth.

Wiring:

```bash
# Any AI tool / plain machine:
export DISCORD_BOT_TOKEN="your-bot-token"
export GITHUB_TOKEN="your-fine-grained-pat"
```

On Muse, store them in the Secure Vault instead (`custom.discord`,
`custom.github`) and skip the env vars.

## Smoke test

```bash
pipeline/skills/discord/bin/discord guilds
pipeline/skills/github/bin/gh-sync --repo OWNER/REPO --dir /path/to/local/copy \
    --message "verify rebuilt pipeline"
# expect: "0 synced, N unchanged, 0 failed"
```

## Running a review

Follow `../WORKFLOW.md` end to end. The two CLIs cover the Discord reads and
the GitHub push; reading the linked Google Docs needs a browser (or any tool
that can fetch the doc text read-only).

## Notes

- These are portable snapshots taken 2026-09-27. If the workflow evolves,
  re-export them from the author's workspace.
- A Discord `429` is a hard stop — never retry in a loop.
- Automation never moves a `canceled` proposal to another status.
- `proposals/darkon-bot-test-prop.json` is a marked test record; real tooling
  should exclude it from public displays.
