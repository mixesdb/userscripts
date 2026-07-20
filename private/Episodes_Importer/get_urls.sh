#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: ./get_urls.sh SOUNDCLOUD_OR_MIXCLOUD_URL [cleanup=true|false] [OUTPUT_FILE]

Requires python3 to be installed. SoundCloud URLs also require yt-dlp.

Examples:
  cd private/Episodes_Importer
  bash get_urls.sh "https://soundcloud.com/inverted-audio/sets/inverted-audio-mix-series"
  bash get_urls.sh "https://www.mixcloud.com/inverted_audio/"
  bash get_urls.sh "https://www.mixcloud.com/inverted_audio/" cleanup=false mixcloud_arr.txt

Fetches a Mixcloud profile/playlist with Mixcloud's public API, or a
SoundCloud playlist/profile with yt-dlp, and writes a JavaScript object keyed only by the episode number:

var arr = {
    "403": "https://...",
    "402": "https://..."
};

By default, cleanup=true extracts episode numbers from titles and sorts items by
episode number descending. Use cleanup=false to keep source titles as keys and
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

if [[ "${url}" == *"mixcloud.com"* ]]; then
    python3 - "${url}" > "${temp_json}" <<'PYFETCH'
import json
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen

source_url = sys.argv[1]
parsed = urlparse(source_url)
parts = [part for part in parsed.path.split('/') if part]
if not parts:
    raise SystemExit('Error: Mixcloud URL must include a username or playlist path.')

api_base = 'https://api.mixcloud.com/' + '/'.join(parts) + '/'
api_urls = [api_base]
if len(parts) == 1:
    api_urls = [api_base + 'cloudcasts/']

entries = []
for api_url in api_urls:
    next_url = api_url
    while next_url:
        request = Request(next_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(request) as response:
            payload = json.load(response)

        data = payload.get('data')
        if isinstance(data, list):
            entries.extend(data)
            next_url = (payload.get('paging') or {}).get('next')
        else:
            entries.append(payload)
            connections = payload.get('connections') or {}
            if 'cloudcasts' in connections and len(parts) > 1:
                next_url = connections['cloudcasts']
            else:
                next_url = None

print(json.dumps({'entries': entries}))
PYFETCH
elif [[ "${url}" == *"soundcloud.com"* ]]; then
    if ! command -v yt-dlp >/dev/null 2>&1; then
        echo "Error: yt-dlp is required for SoundCloud URLs but was not found in PATH." >&2
        exit 1
    fi

    yt-dlp \
        --ignore-errors \
        --flat-playlist \
        --dump-single-json \
        "${url}" > "${temp_json}"
else
    echo "Error: only SoundCloud and Mixcloud URLs are supported." >&2
    exit 1
fi

python3 - "${temp_json}" "${output_file}" "${cleanup}" "${url}" <<'PY'
import json
import re
import sys
from urllib.parse import urlparse

input_path, output_path, cleanup_arg, source_url = sys.argv[1:5]
cleanup = cleanup_arg == "true"

EPISODE_PATTERNS = [
    re.compile(r"\bia[\s_-]*mix(?:[\s_-]*series)?[\s_#.:/-]*(?P<episode>\d{1,5})\b", re.I),
    re.compile(r"\binverted[\s_-]+audio[\s_-]+mix(?:[\s_-]*series)?[\s_#.:/-]*(?P<episode>\d{1,5})\b", re.I),
    re.compile(r"\b(?:episode|ep|mix|show|number|no\.?|#)[\s_#.:/-]*(?P<episode>\d{1,5})\b", re.I),
]


def parse_episode(*values):
    for value in values:
        for pattern in EPISODE_PATTERNS:
            match = pattern.search(value or "")
            if match:
                return match.group("episode")

    return None


def canonical_url(entry):
    permalink_url = entry.get("permalink_url") or entry.get("url") or ""
    if permalink_url.startswith(("http://", "https://")):
        return permalink_url

    webpage_url = entry.get("webpage_url") or ""
    url = entry.get("url") or ""
    key_url = entry.get("key") or ""
    if webpage_url.startswith(("http://", "https://")) and "api.soundcloud.com" not in webpage_url:
        return webpage_url
    if url.startswith(("http://", "https://")) and "api.soundcloud.com" not in url:
        return url

    ie_key = (entry.get("ie_key") or entry.get("extractor_key") or "").lower()
    if not ie_key:
        ie_key = "soundcloud" if "soundcloud.com" in source_url else "mixcloud" if "mixcloud.com" in source_url else ""
    uploader = entry.get("uploader") or entry.get("channel") or entry.get("playlist_uploader") or ""
    display_id = entry.get("display_id") or entry.get("id") or ""

    if "soundcloud" in ie_key and uploader and display_id:
        return f"https://soundcloud.com/{uploader}/{display_id}"

    if key_url.startswith("/"):
        return f"https://www.mixcloud.com{key_url}"

    if "mixcloud" in ie_key and uploader and display_id:
        parsed = urlparse(display_id)
        if parsed.scheme:
            return display_id
        return f"https://www.mixcloud.com/{uploader}/{display_id.strip('/')}"

    for candidate in (webpage_url, url):
        if candidate.startswith(("http://", "https://")):
            return candidate

    return webpage_url or url


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
    title = entry.get("title") or entry.get("name") or ""
    url = canonical_url(entry)
    key = parse_episode(
        title,
        entry.get("display_id") or "",
        entry.get("name") or "",
        entry.get("id") or "",
        entry.get("webpage_url") or "",
        entry.get("url") or "",
        url,
    ) if cleanup else title or url

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
