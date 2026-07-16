#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: ./youtube_ids.sh CHANNEL_OR_PLAYLIST_URL [cleanup=true|false]

Requires yt-dlp to be installed.

Example usage:
1) Run
cd ~/Documents/GitHub/userscripts/private/Player_URLs/YouTube && bash youtube_ids.sh \
"https://www.youtube.com/playlist?list=PLDVfe6lWuhCsfgD6BJwbLdDlnr6i9dlWL" cleanup=true

2) Copy episodes_arr.txt to the userscript
This file could be loaded in the userscript but requires a Commit and the work is done locally anyways…

Fetches a YouTube channel or playlist with yt-dlp and writes episodes_arr.txt
in this directory as a JavaScript object of episode/date keys to youtu.be URLs.

By default, cleanup=true normalizes keys and sorts items by key ascending.
Use cleanup=false to keep original titles and yt-dlp order.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage >&2
    exit 1
fi

if ! command -v yt-dlp >/dev/null 2>&1; then
    echo "Error: yt-dlp is required but was not found in PATH." >&2
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required but was not found in PATH." >&2
    exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
output_file="${script_dir}/episodes_arr.txt"
temp_json="$(mktemp)"
trap 'rm -f "${temp_json}"' EXIT

url="$1"
cleanup_arg="${2:-true}"

case "${cleanup_arg}" in
    true|cleanup=true)
        cleanup="true"
        ;;
    false|cleanup=false)
        cleanup="false"
        ;;
    *)
        echo "Error: cleanup must be true, false, cleanup=true, or cleanup=false." >&2
        usage >&2
        exit 1
        ;;
esac

yt-dlp \
    --ignore-errors \
    --flat-playlist \
    --playlist-reverse \
    --dump-single-json \
    "${url}" > "${temp_json}"

python3 - "${temp_json}" "${output_file}" "${cleanup}" <<'PY'
import json
import re
import sys
from datetime import date

input_path, output_path, cleanup_arg = sys.argv[1:4]
cleanup = cleanup_arg == "true"

MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}
MONTH_PATTERN = "|".join(MONTHS)
DATE_PATTERNS = [
    # 1 July 2026 / 1st July 2026
    re.compile(rf"\b(?P<day>\d{{1,2}})(?:st|nd|rd|th)?[ .-]+(?P<month>{MONTH_PATTERN})[a-z]*[ ,.-]+(?P<year>\d{{4}})\b", re.I),
    # July 1 2026 / July 1st, 2026
    re.compile(rf"\b(?P<month>{MONTH_PATTERN})[a-z]*[ .-]+(?P<day>\d{{1,2}})(?:st|nd|rd|th)?[,]?[ .-]+(?P<year>\d{{4}})\b", re.I),
    # 2026-07-01 / 2026.07.01 / 2026/7/1
    re.compile(r"\b(?P<year>\d{4})[-./](?P<month>\d{1,2})[-./](?P<day>\d{1,2})\b"),
]
EPISODE_PATTERNS = [
    # Prefer numbers that look like explicit episode identifiers.
    re.compile(r"\b(?:ep(?:isode)?|podcast|show|mix|session|number|no\.?|#)\s*[-.:#]?\s*(?P<episode>\d{1,5})\b", re.I),
    # Fallback for titles such as "CLR Podcast 474 | FJAAK".
    re.compile(r"\b(?P<episode>\d{1,5})\b"),
]


def parse_date(title):
    for pattern in DATE_PATTERNS:
        match = pattern.search(title)
        if not match:
            continue

        year = int(match.group("year"))
        day = int(match.group("day"))
        month_value = match.group("month")
        month = int(month_value) if month_value.isdigit() else MONTHS[month_value.lower()[:3]]

        try:
            return date(year, month, day).isoformat()
        except ValueError:
            continue

    return None


def parse_episode(title):
    for pattern in EPISODE_PATTERNS:
        match = pattern.search(title)
        if match:
            return match.group("episode")

    return None


def normalize_title_key(title):
    return parse_date(title) or parse_episode(title) or title


with open(input_path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

entries = data.get("entries") or []

items = []
for entry in entries:
    if not entry:
        continue

    video_id = entry.get("id")
    title = entry.get("title")

    if not video_id or not title:
        continue

    key = normalize_title_key(title) if cleanup else title
    items.append((key, f"https://youtu.be/{video_id}"))

def item_sort_key(item):
    key = item[0]
    if key.isdigit():
        return (0, int(key))

    return (1, key.casefold())


if cleanup:
    items.sort(key=item_sort_key)

with open(output_path, "w", encoding="utf-8") as handle:
    handle.write("var episodes_arr = {\n")

    for key, url in items:
        title_json = json.dumps(key, ensure_ascii=False)
        url_json = json.dumps(url, ensure_ascii=False)
        handle.write(f"    {title_json}: {url_json},\n")

    handle.write("};\n")
PY

printf 'Wrote %s\n' "${output_file}"
