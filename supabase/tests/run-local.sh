#!/usr/bin/env bash
# Validates migrations + seed + RLS tests on a throwaway local Postgres database.
# Needs a local Postgres (psql, createdb) you can connect to. Not for real Supabase projects.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${TEST_DB:-tabletap_test}"
PSQL="psql -v ON_ERROR_STOP=1 -q"
dropdb --if-exists "$DB"; createdb "$DB"
$PSQL -d "$DB" -f supabase/tests/00_supabase_stubs.sql
for f in supabase/migrations/*.sql; do echo "== applying $f"; $PSQL -d "$DB" -f "$f"; done
node supabase/seed/build-seed.mjs
$PSQL -d "$DB" -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/rls.test.sql 2>&1 | grep -E "ok -|PASSED|ERROR|FAILED"
