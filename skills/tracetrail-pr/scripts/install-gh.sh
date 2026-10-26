#!/bin/sh
# Installs the latest gh release into ~/.local/bin (no root needed) and prints its path.
# For Linux and macOS on amd64 or arm64; elsewhere install gh by hand.
set -eu

case "$(uname -s)" in
  Linux) os=linux ext=tar.gz ;;
  Darwin) os=macOS ext=zip ;;
  *) echo "install-gh: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "install-gh: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac

# Tags via git, since the API and the releases/latest redirect are often blocked in sandboxes.
version=$(git ls-remote --tags --refs https://github.com/cli/cli 'v*' |
  sed -n 's|.*refs/tags/v\([0-9]*\.[0-9]*\.[0-9]*\)$|\1|p' | sort -t. -k1,1n -k2,2n -k3,3n | tail -n 1)
[ -n "$version" ] || { echo "install-gh: could not find the latest gh version" >&2; exit 1; }

name="gh_${version}_${os}_${arch}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/gh.$ext" "https://github.com/cli/cli/releases/download/v${version}/${name}.${ext}"
if [ "$ext" = zip ]; then unzip -q "$tmp/gh.zip" -d "$tmp"; else tar -xzf "$tmp/gh.tar.gz" -C "$tmp"; fi

mkdir -p "$HOME/.local/bin"
install -m 755 "$tmp/$name/bin/gh" "$HOME/.local/bin/gh"
"$HOME/.local/bin/gh" --version >&2
echo "$HOME/.local/bin/gh"
