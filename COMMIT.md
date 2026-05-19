# Commit Convention

## Rule

Every meaningful change gets its own commit. One commit = one logical change. If a change includes a new test, that test commit comes **before** the implementation commit (TDD).

## Format

```
<type>(<scope>): <description>
```

| Part | Rule |
|------|------|
| `type` | One of `feat`, `fix`, `test`, `refactor`, `docs`, `style`, `chore` |
| `scope` | The module/area affected (e.g. `auth`, `employees`, `api`, `frontend`) |
| `description` | Imperative, lowercase, no period — "add login endpoint" not "added login endpoint." |

## TDD Workflow

Every feature follows Red → Green → Refactor as separate commits:

| Step | Commit type | Pattern | Example |
|------|-------------|---------|---------|
| 🔴 Red | `test` | Write a failing test first | `test(auth): add login validation tests` |
| 🟢 Green | `feat` | Write minimum code to pass | `feat(auth): add login endpoint with validation` |
| 🔵 Refactor | `refactor` | Clean up, tests still pass | `refactor(auth): extract password hashing helper` |

The git log should show: test → feat → refactor in sequence for each feature.

## Examples from this repo

```
test: add auth system tests
feat: add AuthController (login, register, password, lockout)
test: add auth headers to existing tests
feat: add login and change-password pages
fix: password change now sends Authorization header
docs: compact AGENTS.md with high-signal facts for agents
```

## Rules

- **Commit early, commit often** — every working state gets committed
- **Tests before code** — write the failing test first, then implement
- **One concern per commit** — don't mix a `feat` and a `fix` in the same commit
- **Messages are imperative** — "add" not "added", "fix" not "fixed"
- **No skip hooks** — never use `--no-verify`
