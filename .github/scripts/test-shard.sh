#!/usr/bin/env bash
# Runs one of the 3 CI test shards: bash .github/scripts/test-shard.sh 1|2|3
# Playwright's own --shard splits the test list in order, which put every slow phone test in one
# shard (10 minutes against 2-3 for the others). These groups were balanced on CI timings of PR #41:
#   1: the phone layout and touch tests on the repo, dev and prod copies (mobile.spec.js)
#   2: the rest of mobile.spec.js, phone screenshots and budget, pacing, the built sites
#   3: every other test file, so a new file always runs somewhere
# Every test runs in exactly one shard: shard 1 takes the titles matching PHONES, 2 and 3 the rest.
set -euo pipefail
PHONES='(repo|dev|prod) phone'
SECOND=(tests/mobile.spec.js tests/phone-checks.spec.js tests/pacing.spec.js tests/site-build.spec.js)
case "${1:-}" in
  1) exec npx playwright test --grep "$PHONES" ;;
  2) exec npx playwright test --grep-invert "$PHONES" "${SECOND[@]}" ;;
  3)
    rest=()
    for f in tests/*.spec.js; do
      skip=''
      for s in "${SECOND[@]}"; do [ "$f" = "$s" ] && skip=1; done
      [ -z "$skip" ] && rest+=("$f")
    done
    exec npx playwright test --grep-invert "$PHONES" "${rest[@]}" ;;
  *) echo "usage: $0 1|2|3" >&2; exit 2 ;;
esac
