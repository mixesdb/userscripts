#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<'USAGE'
Usage: ./youtube_ids.sh CHANNEL_OR_PLAYLIST_URL

Example usage:
1) Run
cd ~/Documents/GitHub/userscripts/private/Player_URLs/YouTube && bash youtube_ids.sh "https://www.youtube.com/playlist?list=PLbGMlxGYa2cPhwpMoyZeYUkoBNTZ8NYVq"

2) Copy episodes_arr.txt to the userscript
This file could be loaded in the userscript but requires a Commit and the work is done locally anyways…

Fetches a YouTube channel or playlist with yt-dlp and writes youtube_ids.txt
in this directory as a JavaScript object of video titles to youtu.be URLs.
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
fi

if [[ $# -ne 1 ]]; then
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

yt-dlp \
    --ignore-errors \
    --flat-playlist \
    --playlist-reverse \
    --dump-single-json \
    "${url}" > "${temp_json}"

python3 - "${temp_json}" "${output_file}" <<'PY'
import json
import sys

input_path, output_path = sys.argv[1:3]

with open(input_path, "r", encoding="utf-8") as handle:
    data = json.load(handle)

entries = data.get("entries") or []

with open(output_path, "w", encoding="utf-8") as handle:
    handle.write("var episodes_arr = {\n")

    for entry in entries:
        if not entry:
            continue

        video_id = entry.get("id")
        title = entry.get("title")

        if not video_id or not title:
            continue

        title_json = json.dumps(title, ensure_ascii=False)
        url_json = json.dumps(f"https://youtu.be/{video_id}", ensure_ascii=False)
        handle.write(f"    {title_json}: {url_json},\n")

    handle.write("};\n")
PY

printf 'Wrote %s\n' "${output_file}"
