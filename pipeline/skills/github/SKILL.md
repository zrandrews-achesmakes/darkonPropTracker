---
name: "github"
description: "Use Github when the user asks for Github or this provider's API."
---

## Portability
This is a portable snapshot (2026-09-27) of the skill. Auth resolves via
`pipeline/skills/auth.py`: the Muse Secure Vault entry `custom.github` when
available, otherwise the `GITHUB_TOKEN` environment variable (a fine-grained
PAT with Contents and Pull requests read/write on this repo). No code changes are needed
to run this on another AI tool or machine — just export the env var. The
GitHub API logic is plain Python stdlib.

# Github

## Purpose
Use Github with the user-connected `custom.github` credential.

## Tooling
Add service-specific CLIs under `~/workspace/skills/github/bin/`.

- `python gh-sync --repo OWNER/REPO --dir LOCAL_DIR --dry-run` validates approved JSON files without network access.
- `python gh-sync --repo OWNER/REPO --dir LOCAL_DIR --branch automation/<unique-run-name>` validates data, creates one commit on a new branch, and opens a PR.
  The only destination for this repository is `zrandrews-achesmakes/darkonPropTracker`.
  The tool never uploads code, arbitrary files, or dotfiles and never updates main.
  Review the PR before merging; terminal records and outcomes require manual changes.

Python CLIs must import `/opt/hatch/skills/skill-creator/bin/dynamic_credentials.py` and call `add_surrogate_to_request(...)`, `url_with_surrogate_query_param(...)`, or `url_with_surrogate_path_segment(...)` before authenticated requests, matching where the provider reads the key. Use the local `auth.open_authenticated(req, service)` wrapper for authenticated requests. It enforces the provider origin and disables redirects. Read JSON with the local `auth.read_json_response(resp)` wrapper. They must send only `hsurr:*` values, and only to the hosts below.

## Auth
The credential is already stored; nothing here collects one. Never ask the user to paste a raw key in chat, set a secret environment variable, pass a secret flag, or write an auth file.

A 401 or 403 is a question about the request before it is a question about the key. Check that the credential was attached at all: a request built without the helpers named under Tooling carries nothing, and that looks exactly like a wrong or under-scoped token. Only once a request that did carry the credential is still rejected, call `credentials.request_api_access` with `reconnect` to replace it. The connector is stored as `custom.github`.

## Operating Rules
1. Use this skill when the user asks for Github or this provider's API.
2. Restrict authenticated requests to: api.github.com.
3. Do not print, log, or persist raw credentials.
4. If auth is missing or rejected, follow the Auth section rather than asking for a key.

