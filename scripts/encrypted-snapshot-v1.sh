#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  echo 'Usage: encrypted-snapshot-v1.sh backup SOURCE.sqlite NEW.gpg RECIPIENT_FINGERPRINT [RECIPIENT_FINGERPRINT ...]' >&2
  echo '       encrypted-snapshot-v1.sh restore ARCHIVE.gpg NEW.sqlite' >&2
  exit 2
}
[[ $# -ge 3 ]] || usage
operation=$1
source_file=$(realpath -e -- "$2")
destination=$(realpath -m -- "$3")
shift 3
[[ -f "$source_file" ]] || usage
[[ ! -e "$destination" && ! -L "$destination" ]] || { echo 'Destination already exists.' >&2; exit 1; }
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
parent=$(dirname -- "$destination")
mkdir -p -- "$parent"
# BACKUP_TMPDIR should be an encrypted local volume or adequately sized tmpfs.
staging=$(mktemp -d -- "${BACKUP_TMPDIR:-${TMPDIR:-/tmp}}/clinic-snapshot.XXXXXXXX")
out_dir=''
cleanup() {
  rm -rf -- "$staging"
  if [[ -n "$out_dir" ]]; then rm -rf -- "$out_dir"; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
case "$operation" in
  backup)
    [[ $# -ge 1 ]] || usage
    recipients=()
    for fingerprint in "$@"; do
      [[ "$fingerprint" =~ ^([[:xdigit:]]{40}|[[:xdigit:]]{64})$ ]] || usage
      recipients+=(--recipient "$fingerprint")
    done
    node "$script_dir/sqlite-copy.mjs" backup "$source_file" "$staging/snapshot.sqlite"
    out_dir=$(mktemp -d -- "$parent/.encrypted-snapshot.XXXXXXXX")
    # Full pinned fingerprints supply recipient trust. GPG selects a usable encryption subkey.
    gpg --no-options --batch --no-tty --no-auto-key-retrieve --trust-model always \
      --cipher-algo AES256 --output "$out_dir/snapshot.gpg" "${recipients[@]}" --encrypt "$staging/snapshot.sqlite"
    sync -f "$out_dir/snapshot.gpg"
    ln -T -- "$out_dir/snapshot.gpg" "$destination"
    sync -f "$parent"
    ;;
  restore)
    [[ $# -eq 0 ]] || usage
    gpg --no-options --batch --no-tty --no-auto-key-retrieve --output "$staging/snapshot.sqlite" --decrypt "$source_file"
    node "$script_dir/sqlite-copy.mjs" restore "$staging/snapshot.sqlite" "$destination"
    sync -f "$destination"
    ;;
  *) usage ;;
esac
