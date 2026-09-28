"""Portable credential helper for the Darkon pipeline CLIs.

Auth is resolved in this order:
1. The Muse Secure Vault helper (``/opt/hatch/skills/skill-creator/bin``).
   Works on any Muse account that has the matching vault entries
   (``custom.discord`` / ``custom.github``).
2. Environment variables (works on any AI tool or plain machine):
     DISCORD_BOT_TOKEN  - Discord bot token ("Bot " prefix added if missing)
     GITHUB_TOKEN       - GitHub fine-grained PAT (Contents: read and write)

Nothing here prints, logs, or persists credential values.
"""
import json
import os
import sys
import urllib.request

_MUSE_HELPER = "/opt/hatch/skills/skill-creator/bin"

_SPECS = {
    "discord": {
        "cred": "custom.discord",
        "env": "DISCORD_BOT_TOKEN",
        "hosts": ["discord.com"],
        "header": lambda t: t if t.startswith("Bot ") else "Bot " + t,
    },
    "github": {
        "cred": "custom.github",
        "env": "GITHUB_TOKEN",
        "hosts": ["api.github.com"],
        "header": lambda t: t if t.startswith("Bearer ") else "Bearer " + t,
    },
}


def _muse_attach(req, cred, allowed_hosts):
    """Try the Muse vault helper. Returns True if it attached a credential."""
    if _MUSE_HELPER not in sys.path:
        sys.path.insert(0, _MUSE_HELPER)
    try:
        from dynamic_credentials import add_surrogate_to_request
    except ImportError:
        return False
    try:
        add_surrogate_to_request(req, cred, allowed_hosts=allowed_hosts)
        return True
    except Exception:
        return False


def attach_auth(req, service):
    """Attach auth for ``service`` ("discord" or "github") to a Request."""
    spec = _SPECS[service]
    if _muse_attach(req, spec["cred"], spec["hosts"]):
        return
    token = (os.environ.get(spec["env"]) or "").strip()
    if not token:
        raise SystemExit(
            "auth error: no credential for %s. Set the %s environment "
            "variable, or connect the Muse vault entry %s." % (
                service, spec["env"], spec["cred"])
        )
    req.add_header("Authorization", spec["header"](token))


def read_json_response(resp):
    return json.loads(resp.read().decode("utf-8"))


def read_response_body(exc):
    try:
        return exc.read()
    except Exception:
        return b""
