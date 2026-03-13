#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/YOUR_ORG/promptyard2.git"
INSTALL_DIR="${PROMPTYARD_INSTALL_DIR:-$HOME/.promptyard2}"

# Check prerequisites
for cmd in node npm git; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --rebase
else
  echo "Installing promptyard2 to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm install --silent
npm run build --silent
npm link

echo ""
echo "Done! Run 'promptyard2 --help' to get started."
