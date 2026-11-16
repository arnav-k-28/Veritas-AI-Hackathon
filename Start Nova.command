#!/bin/bash
# Start Nova's local server on macOS. Run with: bash "Start Nova.command"
set -u
cd "$(dirname "$0")" || exit 1
umask 077
url='http://127.0.0.1:8787/'
health="${url}api/health"

server_ready() {
  curl --silent --fail --max-time 2 "$health" 2>/dev/null | grep -q '"engines"'
}

if server_ready; then
  echo "Nova is already running at $url"
  open "$url"
  exit 0
fi

python=''
for candidate in python3.14 python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    python=$(command -v "$candidate")
    break
  fi
done
if [ -z "$python" ]; then
  echo 'Nova needs Python 3.10 or newer. Install Python from https://www.python.org/downloads/macos/ and run this command again.'
  exit 1
fi

mkdir -p .runtime || exit 1
nohup "$python" backend/translator_server.py >.runtime/nova-server.log 2>.runtime/nova-server-error.log </dev/null &
nova_pid=$!
for attempt in {1..40}; do
  if server_ready; then
    echo "Nova is running at $url"
    open "$url"
    exit 0
  fi
  if ! kill -0 "$nova_pid" 2>/dev/null; then
    echo 'Nova could not start. Check .runtime/nova-server-error.log for details.'
    exit 1
  fi
  sleep 0.5
done
echo 'Nova did not start in time. Check .runtime/nova-server-error.log for details.'
exit 1
