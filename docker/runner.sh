#!/bin/bash
# benchme runner contract:
#   in : $PATCH_FILE (unified diff), $HIDDEN_MANIFEST (json [{key,path}]) + files under $HIDDEN_DIR,
#        $RUN_LINT / $RUN_TYPECHECK ("true"/"false")
#   out: the LAST stdout line is a JSON report
#        {applied, tests:[{id, ok}], lint, typecheck, error?}
# Runs offline (no network): every dependency is baked into the image.
set -uo pipefail
WORK=${WORK_DIR:-/work/repo}
mkdir -p "$WORK" && cp -a /app/. "$WORK"/ && cd "$WORK" || { echo '{"applied":false,"tests":[],"error":"workspace copy failed"}'; exit 1; }

report() { node -e 'const r=JSON.parse(process.argv[1]);process.stdout.write("\n"+JSON.stringify(r)+"\n")' "$1"; }

if [ ! -s "${PATCH_FILE:-/nonexistent}" ]; then
  report '{"applied":false,"tests":[],"error":"no patch supplied"}'; exit 1
fi
if ! git apply --whitespace=nowarn --check "$PATCH_FILE" >/tmp/apply.log 2>&1 || ! git apply --whitespace=nowarn "$PATCH_FILE" >>/tmp/apply.log 2>&1; then
  ERR=$(head -c 400 /tmp/apply.log | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(s)))')
  report "{\"applied\":false,\"tests\":[],\"error\":$ERR}"; exit 1
fi

# Hidden files land AFTER the patch so a submission cannot pre-empt them.
if [ -s "${HIDDEN_MANIFEST:-/nonexistent}" ]; then
  node -e '
    const fs=require("fs"),path=require("path");
    for (const {key,path:rel} of JSON.parse(fs.readFileSync(process.env.HIDDEN_MANIFEST,"utf8"))) {
      const dest=path.join(process.cwd(), rel);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.copyFileSync(path.join(process.env.HIDDEN_DIR, key), dest);
    }'
fi

npx vitest run --reporter=json --outputFile=/tmp/vitest.json >/tmp/vitest.log 2>&1 || true
LINT=null; TYPECHECK=null
if [ "${RUN_LINT:-true}" = "true" ]; then npm run -s lint >/tmp/lint.log 2>&1 && LINT=true || LINT=false; fi
if [ "${RUN_TYPECHECK:-true}" = "true" ]; then npm run -s typecheck >/tmp/tsc.log 2>&1 && TYPECHECK=true || TYPECHECK=false; fi

node -e '
  const fs=require("fs");
  let tests=[];
  try {
    const j=JSON.parse(fs.readFileSync("/tmp/vitest.json","utf8"));
    for (const f of j.testResults||[]) for (const a of f.assertionResults||[]) tests.push({id:a.fullName, ok:a.status==="passed"});
  } catch (e) { tests=[]; }
  const lint=process.argv[1]==="null"?undefined:process.argv[1]==="true";
  const typecheck=process.argv[2]==="null"?undefined:process.argv[2]==="true";
  process.stdout.write("\n"+JSON.stringify({applied:true,tests,lint,typecheck})+"\n");
' "$LINT" "$TYPECHECK"
