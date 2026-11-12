#!/bin/bash
# Review mutants for PR #15 security libs. One replacement each, run the PR's own tests (not zz-*), restore.
cd /home/janos/work/jancsi/elmentve-r13/worker || exit 1
TESTS="test/webhookVerify.test.ts test/unsubscribe.test.ts test/suppression.test.ts test/twilioWebhookVerify.test.ts test/senderConfig.test.ts"
run() { # name file perl-substitution
  cp "$2" /tmp/claude-1000/jancsi-mut.bak
  perl -0pi -e "$3" "$2"
  if cmp -s "$2" /tmp/claude-1000/jancsi-mut.bak; then echo "$1: NOT APPLIED"; return; fi
  out=$(npx vitest run $TESTS 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ +Tests ')
  if echo "$out" | grep -q failed; then echo "$1: KILLED $out"; else echo "$1: SURVIVED $out"; fi
  cp /tmp/claude-1000/jancsi-mut.bak "$2"
}
W=src/lib/webhookVerify.ts; U=src/lib/unsubscribe.ts; S=src/lib/suppression.ts; T=src/lib/twilioWebhookVerify.ts
run WV-no-skew      $W 's/if \(skew > MAX_TIMESTAMP_SKEW_SECONDS\)/if (false)/'
run WV-future-ok    $W 's/Math\.abs\(now\.getTime\(\) \/ 1000 - timestampSeconds\)/(now.getTime() \/ 1000 - timestampSeconds)/'
run WV-no-id        $W 's/`\$\{headers\.id\}\.\$\{headers\.timestamp\}\.\$\{rawBody\}`/`\$\{headers.timestamp\}.\$\{rawBody\}`/'
run WV-no-ts-in-sig $W 's/`\$\{headers\.id\}\.\$\{headers\.timestamp\}\.\$\{rawBody\}`/`\$\{headers.id\}.\$\{rawBody\}`/'
run WV-eq-true      $W 's/  return diff === 0;\n\}/  return true;\n}/'
run WV-no-prefix-check $W "s/if \(!secret\.startsWith\('whsec_'\)\) \{/if (false) {/"
run WV-first-only   $W 's/candidates\.some\(\(candidate\)/candidates.slice(0, 1).some((candidate)/'
run US-no-expiry    $U 's/Math\.floor\(now\.getTime\(\) \/ 1000\) > payload\.expiresAt/false/'
run US-no-channel   $U "s/\(payload\.channel !== 'email' && payload\.channel !== 'sms'\) \|\|//"
run US-eq-true      $U 's/  return diff === 0;\n\}/  return true;\n}/'
run US-expiry-ge    $U 's/Math\.floor\(now\.getTime\(\) \/ 1000\) > payload\.expiresAt/Math.floor(now.getTime() \/ 1000) >= payload.expiresAt/'
run SP-no-lower     $S 's/trimmed\.toLowerCase\(\)/trimmed/'
run SP-no-trim      $S 's/const trimmed = address\.trim\(\);/const trimmed = address;/'
run SP-throw-off    $S 's/throw new Error\(`is_suppressed rpc failed/return false; (`is_suppressed rpc failed/'
run TW-no-sort      $T 's/Object\.keys\(formParams\)\.sort\(\)/Object.keys(formParams)/'
run TW-no-url       $T 's/let signedContent = fullUrl;/let signedContent = "";/'
run TW-eq-true      $T 's/  return diff === 0;\n\}/  return true;\n}/'
git status --short src
