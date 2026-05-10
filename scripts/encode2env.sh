#!/usr/bin/env bash
# Usage: ./scripts/encode-service-account.sh [path/to/serviceAccountKey.json]
# Outputs the base64 value to paste into FIREBASE_SERVICE_ACCOUNT_BASE64

set -euo pipefail

KEY_FILE="${1:-serviceAccountKey.json}"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: $KEY_FILE not found" >&2
  exit 1
fi

echo "FIREBASE_SERVICE_ACCOUNT_BASE64=$(base64 -w 0 "$KEY_FILE")"
