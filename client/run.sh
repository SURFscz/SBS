#!/bin/bash
set -euo pipefail
cd /opt/app/client
yarn
export PORT="${PORT:-8080}"
exec yarn start
