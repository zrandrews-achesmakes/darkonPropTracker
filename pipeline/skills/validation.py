"""Bounded, dependency-free validation for public proposal data."""
import datetime
import json
import re
from urllib.parse import urlsplit

MAX_FILE_BYTES = 131072
MAX_PROPOSALS = 200
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
STATUSES = ("To Present", "Up for Vote", "Passed Senate/Playtest", "Passed BOD",
            "Recorded on #passed-and-pending", "Withdraw/Fail")
RESULTS = ("passed_senate", "failed_senate", "passed_bod", "failed_bod", "withdrawn")
ROOT_FILES = ("history.json", "reported.json", "state.json")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_url(value, kind):
    if not isinstance(value, str) or len(value) > 2048 or re.search(r"[\s\\<>]", value):
        return False
    try:
        u = urlsplit(value)
        if (u.scheme != "https" or u.username is not None or u.password is not None
                or u.port not in (None, 443)):
            return False
        if kind == "doc":
            return u.hostname == "docs.google.com" and bool(re.fullmatch(
                r"/document/d/[A-Za-z0-9_-]+(?:/(?:edit|view|preview))?/?", u.path))
        if kind == "discord":
            return u.hostname == "discord.com" and bool(re.fullmatch(
                r"/channels/766364534495117383/1286801164326797385/[0-9]+", u.path))
        return u.hostname == "github.com" and bool(re.fullmatch(
            r"/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/issues/[0-9]+", u.path))
    except ValueError:
        return False


def text(value, limit=8000):
    return isinstance(value, str) and len(value) <= limit


def validate_proposal(p, filename):
    require(isinstance(p, dict), "proposal must be an object")
    require(isinstance(p.get("id"), str) and len(p["id"]) <= 100
            and bool(SLUG.fullmatch(p["id"])), "invalid proposal id")
    require(filename == p["id"] + ".json", "id must match filename")
    require(text(p.get("name"), 300) and bool(p["name"].strip()), "invalid name")
    require(text(p.get("author"), 300), "invalid author")
    require(p.get("status") in STATUSES, "invalid status")
    for key, count, limit in (("summary", 5, 8000), ("line_items", 50, 2000),
                              ("easypoll_blocks", 50, 32000), ("vote_result", 5, 30)):
        value = p.get(key)
        require(isinstance(value, list) and len(value) <= count
                and all(text(s, limit) for s in value), "invalid " + key)
    require(all(r in RESULTS for r in p["vote_result"]), "invalid vote result")
    for key in ("notes", "posted_by", "posted_by_username"):
        require(p.get(key) is None or text(p[key]), "invalid " + key)
    for key, kind in (("doc_url", "doc"), ("discord_post_url", "discord"),
                      ("github_issue_url", "issue")):
        require(p.get(key) is None or safe_url(p[key], kind), "invalid " + key)
    for key in ("presented_at_senate", "voted_at_senate"):
        if p.get(key) is not None:
            require(isinstance(p[key], str), "invalid " + key)
            require(datetime.date.fromisoformat(p[key]).isoformat() == p[key], "invalid " + key)
    if "hidden" in p:
        require(type(p["hidden"]) is bool, "invalid hidden flag")
    return p


def parse_data(raw):
    require(len(raw) <= MAX_FILE_BYTES, "file exceeds size limit")
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "duplicate JSON key")
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=unique_pairs,
                      parse_constant=lambda _: require(False, "non-finite JSON number"))


def validate_snapshot(files):
    require(all(p in files for p in ROOT_FILES), "missing state/history/report data")
    proposals = [p for p in files if p.startswith("proposals/")]
    require(0 < len(proposals) <= MAX_PROPOSALS, "invalid proposal count")
    parsed = {p: parse_data(raw) for p, raw in files.items()}
    ids = set()
    for path in proposals:
        p = validate_proposal(parsed[path], path.removeprefix("proposals/"))
        require(p["id"] not in ids, "duplicate proposal id")
        ids.add(p["id"])
    h, r, s = (parsed[p] for p in ROOT_FILES)
    require(isinstance(h, dict) and isinstance(h.get("events"), list), "invalid history")
    require(isinstance(r, dict) and isinstance(r.get("reported_message_ids"), list)
            and all(isinstance(i, str) and i.isdigit() for i in r["reported_message_ids"]),
            "invalid reported message IDs")
    require(isinstance(s, dict), "invalid state")
    return parsed


def validate_automation_change(before, after):
    """Only document refreshes and the documented presentation move are automatic.

    Manual outcome changes must use a human-reviewed PR outside gh-sync.
    """
    if before == after:
        return
    if before is None:
        require(after["status"] in ("To Present", "Up for Vote") and not after["vote_result"]
                and after.get("voted_at_senate") is None
                and ((after["status"] == "Up for Vote") ==
                     (after.get("presented_at_senate") is not None)), "invalid automatic creation")
        return
    require(before["status"] in ("To Present", "Up for Vote"),
            "automated edits to settled/terminal proposals are forbidden")
    require(after["status"] == before["status"] or
            (before["status"], after["status"]) == ("To Present", "Up for Vote"),
            "manual confirmation required for this status change")
    allowed = {"name", "summary", "line_items", "easypoll_blocks", "notes", "status"}
    if before["status"] == "To Present" and after["status"] == "Up for Vote":
        require(after.get("presented_at_senate") is not None, "presentation date required")
        allowed.add("presented_at_senate")
    require(all(before.get(k) == after.get(k) for k in before.keys() | after.keys()
                if k not in allowed), "automation tried to change a protected field")
