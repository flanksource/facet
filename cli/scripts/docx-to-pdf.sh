#!/bin/bash
set -euo pipefail

usage() {
  printf 'Usage: %s input.docx\n' "${0##*/}"
  printf 'Capture Microsoft Word pages as input.docx.1.png, input.docx.2.png, etc.\n'
  printf 'Measurement and clipping issues produce warnings; captures are saved anyway.\n'
  printf 'Requires Word to be installed and set up in a logged-in desktop session.\n'
  printf 'Allow Terminal to control Microsoft Word when macOS requests Automation access.\n'
  printf 'Requires Accessibility and Screen Recording access, and installed CLI dependencies.\n'
  printf 'Keep the desktop free during capture. Existing page images are never overwritten.\n'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

if [[ $# -eq 1 && ( $1 == --help || $1 == -h ) ]]; then
  usage
  exit 0
fi
if [[ $# -ne 1 ]]; then
  usage >&2
  exit 2
fi

input=$1
[[ -f "$input" ]] || fail "Input file does not exist: $input"
[[ -r "$input" ]] || fail "Input file is not readable: $input"
case "$input" in
  *.[dD][oO][cC][xX]) ;;
  *) fail 'Input must have a .docx extension' ;;
esac

for image in "$input".*.png; do
  [[ ! -e "$image" && ! -L "$image" ]] || fail "Page image already exists: $image"
done
[[ $(uname -s) == Darwin ]] || fail 'This script requires macOS'

input_directory=$(dirname -- "$input")
input_directory=$(cd -- "$input_directory"
  pwd -P)
input="$input_directory/$(basename -- "$input")"

script_directory=$(cd -- "$(dirname -- "$0")"
  pwd -P)
runner="$script_directory/../node_modules/tsx/dist/cli.mjs"
[[ -f "$runner" ]] || fail 'Install CLI dependencies first: pnpm --dir cli install'
exec node "$runner" "$script_directory/word-capture.ts" "$input"
