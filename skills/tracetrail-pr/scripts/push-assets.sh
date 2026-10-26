#!/bin/sh
# Fallback for when gh cannot upload: commits trace maps to the tracetrail-assets
# branch under pr-<n>/, replacing that PR's earlier images, and prints one line per
# image: "<file> <url>". The URLs name the commit, so a re-run gets new URLs and
# GitHub's image cache never shows the old picture. Without FILEs it removes the
# PR's images from the branch tip (old links keep working through their commit).
#
# Usage: push-assets.sh PR_NUMBER [FILE...]   (run inside a clone of the target repo)
# Never touches the working tree, the index or the current branch.
set -eu

BRANCH=tracetrail-assets
[ $# -ge 1 ] || { echo "usage: push-assets.sh PR_NUMBER [FILE...]" >&2; exit 2; }
pr=$1
shift
case "$pr" in *[!0-9]* | '') echo "push-assets: PR_NUMBER must be a number" >&2; exit 2 ;; esac

# owner/repo: GH_REPO if set (gh reads it too), else the last two parts of origin's URL,
# which also covers sandbox git proxies such as http://proxy@127.0.0.1:1234/git/owner/repo.
repo=${GH_REPO:-$(git remote get-url origin | sed -E 's#\.git/?$##; s#^.*[/:]([^/:]+/[^/:]+)$#\1#')}
case "$repo" in
  */*/* | /* | */ | *[!A-Za-z0-9._/-]*) repo= ;;
  */*) ;;
  *) repo= ;;
esac
[ -n "$repo" ] || { echo "push-assets: cannot tell owner/repo from origin; set GH_REPO=owner/repo" >&2; exit 2; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export GIT_INDEX_FILE="$tmp/index"
message="Trace maps for #$pr"
[ $# -gt 0 ] || message="Remove trace maps for #$pr"

for attempt in 1 2 3 4 5; do
  rm -f "$GIT_INDEX_FILE"
  parent=
  if git fetch -q origin "refs/heads/$BRANCH" 2>/dev/null; then
    parent=$(git rev-parse FETCH_HEAD)
    git read-tree "$parent"
    git ls-files -z -- "pr-$pr/" | xargs -0 -r git update-index --force-remove --
  elif [ $# -eq 0 ]; then
    exit 0
  else
    git read-tree --empty
  fi

  : > "$tmp/paths"
  for f in "$@"; do
    path="pr-$pr/$(basename "$f")"
    git update-index --add --cacheinfo "100644,$(git hash-object -w "$f"),$path"
    printf '%s %s\n' "$f" "$path" >> "$tmp/paths"
  done

  tree=$(git write-tree)
  if [ -n "$parent" ] && [ "$tree" = "$(git rev-parse "$parent^{tree}")" ]; then
    commit=$parent # nothing changed; the tip already has these images
  else
    commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "$message")
  fi
  if [ "$commit" = "$parent" ] || git push -q origin "$commit:refs/heads/$BRANCH" 2>"$tmp/push.err"; then
    while read -r f path; do
      printf '%s https://github.com/%s/raw/%s/%s\n' "$f" "$repo" "$commit" "$path"
    done < "$tmp/paths"
    exit 0
  fi
  # Someone else pushed in between: start again from the new tip.
  sleep "$attempt"
done
cat "$tmp/push.err" >&2
echo "push-assets: could not push $BRANCH" >&2
exit 1
