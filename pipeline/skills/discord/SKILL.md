---
name: "discord"
description: "Read a Discord server through the connected bot: list servers and channels, resolve channel names to IDs, and read channel message history."
---

## Portability
This is a portable snapshot (2026-09-27) of the skill. Auth resolves via
`pipeline/skills/auth.py`: the Muse Secure Vault entry `custom.discord` when
available, otherwise the `DISCORD_BOT_TOKEN` environment variable (a Discord
bot token; the "Bot " prefix is added automatically if missing). No code
changes are needed to run this on another AI tool or machine — just export
the env var. The Discord API logic is plain Python stdlib.

# Discord

## Purpose
Read-only access to Discord servers the user's bot has been invited to, using
the user-connected `custom.discord` credential. Used for things like reviewing
proposal-discussion channels without a browser.

## Tooling
CLI: `~/workspace/skills/discord/bin/discord` (Python, stdlib only).

- `discord guilds` — list servers the bot is in (id, name).
- `discord channels --guild GUILD_ID` — list channels (id, name, type, topic).
- `discord resolve --guild GUILD_ID --name NAME` — find a channel ID by name
  (leading `#` optional, case-insensitive).
- `discord read --channel CHANNEL_ID [--limit N] [--before ID] [--after ID] [--all] [--chronological]`
  Read messages. `--limit` caps at 100 per page (default 50). `--all` pages
  through everything (optionally stop at `--after ID`). `--chronological`
  prints oldest first. Each message prints id, timestamp, author, content,
  attachment filenames/URLs, embed count, reactions, and thread id.

Messages print as JSON. A 429 is a hard stop: do not retry in a loop.

Python CLIs must import `/opt/hatch/skills/skill-creator/bin/dynamic_credentials.py` and call `add_surrogate_to_request(...)`, `url_with_surrogate_query_param(...)`, or `url_with_surrogate_path_segment(...)` before authenticated requests, matching where the provider reads the key. If they use `urllib`, read JSON responses with `read_json_response(resp)` from the same helper instead of calling `resp.read()` directly. They must send only `hsurr:*` values, and only to the hosts below.

## Auth
The credential is already stored; nothing here collects one. Never ask the user to paste a raw key in chat, set a secret environment variable, pass a secret flag, or write an auth file.

A 401 or 403 is a question about the request before it is a question about the key. Check that the credential was attached at all: a request built without the helpers named under Tooling carries nothing, and that looks exactly like a wrong or under-scoped token. Only once a request that did carry the credential is still rejected, call `credentials.request_api_access` with `reconnect` to replace it. The connector is stored as `custom.discord`.

## Operating Rules
1. Use this skill when the user asks for Discord or this provider's API.
2. Restrict authenticated requests to: discord.com.
3. Do not print, log, or persist raw credentials.
4. If auth is missing or rejected, follow the Auth section rather than asking for a key.
