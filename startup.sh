#!/bin/sh
set -e
cd /workspace
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/gravewake-dev.log 2>&1 &
echo $! > /tmp/gravewake-dev.pid
exit 0
