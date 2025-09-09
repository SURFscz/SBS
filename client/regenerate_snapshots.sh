#!/usr/bin/env bash
set -euo pipefail

source $NVM_DIR/nvm.sh
nvm use

echo "🔍 Finding and deleting all __snapshots__ directories..."

find . -type d -name "__snapshots__" -exec rm -rf {} +

echo "✅ Deleted all __snapshots__ directories."

echo "🧪 Running tests to regenerate snapshots..."
CI=true yarn test -u

echo "🎉 Snapshots regenerated successfully!"
