#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: ./soundcloud_urls.sh SOUNDCLOUD_OR_MIXCLOUD_URL [cleanup=true|false] [OUTPUT_FILE]

Requires yt-dlp and python3 to be installed.

Examples:
  cd private/Episodes_Importer
  bash soundcloud_urls.sh "https://soundcloud.com/inverted-audio/sets/inverted-audio-mix-series"
  bash soundcloud_urls.sh "https://www.mixcloud.com/inverted_audio/"
  bash soundcloud_urls.sh "https://www.mixcloud.com/inverted_audio/" cleanup=false mixcloud_arr.txt

Fetches a SoundCloud playlist/profile or Mixcloud profile/playlist with yt-dlp and
writes a JavaScript object keyed only by the episode number:

var arr = {
    "403": "https://...",
    "402": "https://..."
};

By default, cleanup=true extracts episode numbers from titles and sorts items by
episode number descending. Use cleanup=false to keep yt-dlp titles as keys and
source order, which is useful for debugging title parsing.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ $# -lt 1 || $# -gt 3 ]]; then
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
url="$1"
cleanup_arg="${2:-true}"
output_file="${3:-${script_dir}/get_urls.txt}"
temp_json="$(mktemp)"
trap 'rm -f "${temp_json}"' EXIT

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
    --dump-single-json \
    "${url}" > "${temp_json}"

python3 - "${temp_json}" "${output_file}" "${cleanup}" <<'PY'
import json
import re
import sys
from urllib.parse import urlparse

input_path, output_path, cleanup_arg = sys.argv[1:4]
cleanup = cleanup_arg == "true"

EPISODE_PATTERNS = [
    re.compile(r"\bia\s*mix\s*(?:series\s*)?(?P<episode>\d{1,5})\b", re.I),
    re.compile(r"\binverted\s+audio\s+mix\s*(?:series\s*)?(?P<episode>\d{1,5})\b", re.I),
    re.compile(r"\b(?:episode|ep|mix|show|number|no\.?|#)\s*[-.:#]?\s*(?P<episode>\d{1,5})\b", re.I),
]


def parse_episode(title):
    for pattern in EPISODE_PATTERNS:
        match = pattern.search(title or "")
        if match:
            return match.group("episode")

    return None


def canonical_url(entry):
    webpage_url = entry.get("webpage_url") or entry.get("url") or ""
    if webpage_url.startswith("http://") or webpage_url.startswith("https://"):
        return webpage_url

    ie_key = (entry.get("ie_key") or entry.get("extractor_key") or "").lower()
    uploader = entry.get("uploader") or entry.get("channel") or entry.get("playlist_uploader") or ""
    display_id = entry.get("display_id") or entry.get("id") or ""

    if "soundcloud" in ie_key and uploader and display_id:
        return f"https://soundcloud.com/{uploader}/{display_id}"

    if "mixcloud" in ie_key and uploader and display_id:
        parsed = urlparse(display_id)
        if parsed.scheme:
            return display_id
        return f"https://www.mixcloud.com/{uploader}/{display_id.strip('/')}"

    return webpage_url


def walk_entries(items):
    for item in items or []:
        if not item:
            continue
        nested = item.get("entries")
        if nested:
            yield from walk_entries(nested)
        else:
            yield item


with open(input_path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

items = []
seen = set()
for entry in walk_entries(data.get("entries") or []):
    title = entry.get("title") or ""
    key = parse_episode(title) if cleanup else title
    url = canonical_url(entry)

    if not key or not url:
        continue

    if cleanup:
        key = str(int(key))

    if key in seen:
        continue

    seen.add(key)
    items.append((key, url))

if cleanup:
    items.sort(key=lambda item: int(item[0]), reverse=True)

with open(output_path, "w", encoding="utf-8") as handle:
    handle.write("var arr = {\n")

    for key, url in items:
        key_json = json.dumps(key, ensure_ascii=False)
        url_json = json.dumps(url, ensure_ascii=False)
        handle.write(f"    {key_json}: {url_json},\n")

    handle.write("};\n")
PY

printf 'Wrote %s\n' "${output_file}"
