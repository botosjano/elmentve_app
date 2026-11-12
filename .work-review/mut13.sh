#!/bin/bash
# Review mutants for PR #13 (backoff + quietHours). One replacement each, run the PR's own tests, restore.
cd /home/janos/work/jancsi/elmentve-r13/worker || exit 1
run() { # name file perl-substitution
  cp "$2" /tmp/claude-1000/jancsi-mut.bak
  perl -0pi -e "$3" "$2"
  if cmp -s "$2" /tmp/claude-1000/jancsi-mut.bak; then echo "$1: NOT APPLIED"; return; fi
  out=$(npx vitest run test/backoff.test.ts test/quietHours.test.ts 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ +Tests ')
  if echo "$out" | grep -q failed; then echo "$1: KILLED $out"; else echo "$1: SURVIVED $out"; fi
  cp /tmp/claude-1000/jancsi-mut.bak "$2"
}
B=src/lib/backoff.ts; Q=src/lib/quietHours.ts
run B-max-gt   $B 's/attemptCount >= maxAttempts/attemptCount > maxAttempts/'
run B-idx-0    $B 's/RETRY_DELAYS_MINUTES\[attemptCount - 1\]/RETRY_DELAYS_MINUTES[attemptCount]/'
run B-fallback-first $B 's/RETRY_DELAYS_MINUTES\[RETRY_DELAYS_MINUTES.length - 1\]/RETRY_DELAYS_MINUTES[0]/'
run B-delays-swap $B 's/\[5, 15, 60, 360\]/[5, 15, 360, 60]/'
run Q-equal-true $Q 's/if \(start === end\) return false;/if (start === end) return true;/'
run Q-day-end-incl $Q 's/localMinutes >= start && localMinutes < end/localMinutes >= start \&\& localMinutes <= end/'
run Q-night-start-excl $Q 's/localMinutes >= start \|\| localMinutes < end/localMinutes > start || localMinutes < end/'
run Q-night-end-incl $Q 's/localMinutes >= start \|\| localMinutes < end/localMinutes >= start || localMinutes <= end/'
run Q-until-le $Q 's/if \(localMinutes < end\) \{/if (localMinutes <= end) {/'
run Q-until-noday $Q 's/24 \* 60 - localMinutes \+ end/end - localMinutes/'
git status --short src
