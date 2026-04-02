# Lessons

- When the user asks to focus on this project, do not read or rely on global `CLAUDE.md`, external skill docs, or other project-level guidance in the response flow. Use only repo-local code, docs, and configuration unless the user explicitly asks otherwise.
- When a runtime bug appears after code-level tests pass, verify against the live compose logs before assuming the code-path root cause is complete. In this repo, the sticky degraded-state bug was real, but the active production issue was also broken ClickHouse auth plus an unescaped insert query in the HTTP client.
- When changing `/`, verify both signed-out and signed-in states separately before claiming the homepage is improved. In this repo they are different products surfaces with different requirements.
- When the user asks to merge `master` first, do that before any further live verification or commit work. After merges in this repo, do not trust host ports like `3000`, `4001`, or `8080` until you confirm which listeners belong to Docker versus unrelated local processes; prefer container-internal checks when the host namespace is polluted.
