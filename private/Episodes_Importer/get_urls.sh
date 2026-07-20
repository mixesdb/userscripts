#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: ./get_urls.sh SOUNDCLOUD_OR_MIXCLOUD_URL [cleanup=true|false] [OUTPUT_FILE]

Requires python3 to be installed. SoundCloud URLs use SoundCloud's public web API, with yt-dlp as a fallback when available.

Examples:
  cd private/Episodes_Importer
  bash get_urls.sh "https://soundcloud.com/inverted-audio/sets/inverted-audio-mix-series"
  bash get_urls.sh "https://www.mixcloud.com/inverted_audio/"
  bash get_urls.sh "https://www.mixcloud.com/inverted_audio/" cleanup=false mixcloud_arr.txt

Fetches a Mixcloud profile/playlist with Mixcloud's public API, or a
SoundCloud playlist/profile with SoundCloud's public web API (or yt-dlp fallback), and writes a JavaScript object keyed only by the episode number:

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
temp_err="$(mktemp)"
trap 'rm -f "${temp_json}" "${temp_err}"' EXIT

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
    if python3 - "${url}" > "${temp_json}" <<'PYFETCH'
import json
import re
import sys
from html import unescape
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

source_url = sys.argv[1]
headers = {'User-Agent': 'Mozilla/5.0'}


def fetch_text(url):
    request = Request(url, headers=headers)
    with urlopen(request, timeout=30) as response:
        return response.read().decode('utf-8', 'replace')


def fetch_json(url):
    request = Request(url, headers={**headers, 'Accept': 'application/json'})
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def find_client_id(page_html):
    patterns = [
        r'client_id\s*[:=]\s*["\']([A-Za-z0-9_-]{20,})["\']',
        r'client_id=([A-Za-z0-9_-]{20,})',
    ]
    for pattern in patterns:
        match = re.search(pattern, page_html)
        if match:
            return match.group(1)

    scripts = re.findall(r'<script[^>]+src=["\']([^"\']+\.js)["\']', page_html)
    for script_url in reversed(scripts):
        if script_url.startswith('//'):
            script_url = 'https:' + script_url
        elif script_url.startswith('/'):
            script_url = 'https://soundcloud.com' + script_url
        try:
            script = fetch_text(unescape(script_url))
        except (HTTPError, URLError, TimeoutError):
            continue
        for pattern in patterns:
            match = re.search(pattern, script)
            if match:
                return match.group(1)

    raise SystemExit('Error: could not locate SoundCloud client_id.')


def api_url(path, **params):
    params = {key: value for key, value in params.items() if value is not None}
    params['client_id'] = client_id
    return 'https://api-v2.soundcloud.com' + path + '?' + urlencode(params)


def permalink(track):
    return track.get('permalink_url') or track.get('uri') or track.get('url') or ''


def track_entry(track):
    user = track.get('user') or {}
    return {
        'title': track.get('title') or '',
        'permalink_url': permalink(track),
        'webpage_url': permalink(track),
        'url': permalink(track),
        'id': str(track.get('id') or ''),
        'display_id': track.get('permalink') or '',
        'uploader': user.get('permalink') or user.get('username') or '',
        'ie_key': 'Soundcloud',
    }


def paged_collection(first_url):
    entries = []
    next_url = first_url
    while next_url:
        payload = fetch_json(next_url)
        collection = payload.get('collection') if isinstance(payload, dict) else payload
        if isinstance(collection, list):
            entries.extend(collection)
        next_url = payload.get('next_href') if isinstance(payload, dict) else None
        if next_url and 'client_id=' not in next_url:
            next_url += ('&' if '?' in next_url else '?') + urlencode({'client_id': client_id})
    return entries


def hydrate_tracks(tracks):
    hydrated = []
    missing_ids = []
    for track in tracks:
        if track.get('permalink_url'):
            hydrated.append(track)
        elif track.get('id'):
            missing_ids.append(str(track['id']))

    for index in range(0, len(missing_ids), 50):
        chunk = ','.join(missing_ids[index:index + 50])
        hydrated.extend(fetch_json(api_url('/tracks', ids=chunk)))

    return hydrated


def main():
    page = fetch_text(source_url)
    global client_id
    client_id = find_client_id(page)
    resolved = fetch_json(api_url('/resolve', url=source_url))
    kind = resolved.get('kind')
    entries = []

    if kind == 'playlist':
        playlist_id = resolved.get('id')
        tracks = hydrate_tracks(resolved.get('tracks') or [])
        track_count = resolved.get('track_count') or len(tracks)
        if playlist_id and len(tracks) < track_count:
            # SoundCloud has intermittently returned 404 for this endpoint even
            # when /resolve succeeds, so keep the resolved/hydrated tracks as a
            # usable result instead of aborting with a Python traceback.
            try:
                tracks = paged_collection(api_url(f'/playlists/{playlist_id}/tracks', limit=200, linked_partitioning='1'))
            except (HTTPError, URLError, TimeoutError, OSError) as exc:
                print(f'Warning: SoundCloud playlist pagination failed; using resolved tracks: {exc}', file=sys.stderr)
        entries = [track_entry(track) for track in tracks]
    elif kind == 'user':
        user_id = resolved.get('id')
        if not user_id:
            raise SystemExit('Error: resolved SoundCloud user did not include an id.')
        tracks = paged_collection(api_url(f'/users/{user_id}/tracks', limit=200, linked_partitioning='1'))
        entries = [track_entry(track) for track in tracks]
    elif kind == 'track':
        entries = [track_entry(resolved)]
    else:
        raise SystemExit(f'Error: unsupported SoundCloud resource kind: {kind!r}')

    print(json.dumps({'entries': entries}))


try:
    main()
except SystemExit:
    raise
except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
    raise SystemExit(f'Error: SoundCloud API fetch failed: {exc}')
PYFETCH
    then
        :
    elif command -v yt-dlp >/dev/null 2>&1; then
        echo "Warning: SoundCloud API fetch failed; falling back to yt-dlp." >&2
        yt-dlp \
            --ignore-errors \
            --flat-playlist \
            --dump-single-json \
            "${url}" > "${temp_json}"
    else
        echo "Error: SoundCloud API fetch failed and yt-dlp is not installed for fallback." >&2
        exit 1
    fi
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
