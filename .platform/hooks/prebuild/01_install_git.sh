#!/bin/bash
set -euo pipefail

if command -v git >/dev/null 2>&1; then
  exit 0
fi

if command -v dnf >/dev/null 2>&1; then
  dnf install -y git
elif command -v yum >/dev/null 2>&1; then
  yum install -y git
else
  echo "No supported package manager found to install git." >&2
  exit 1
fi
