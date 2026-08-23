# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues on **Arabya-ai/arabya-web**. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** Cloud agents open draft PRs for review; they are not treated as external feature requests for `/triage`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Arabya notes

- Production ship path is Contabo (CI + Deploy Contabo), not GitHub Issues alone.
- Owner is non-technical; prefer Arabic plain-language updates when asking them to act.
- Prefer draft PRs (`ManagePullRequest`) over direct `main` commits for agent work.
