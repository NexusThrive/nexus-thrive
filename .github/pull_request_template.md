## Summary

Describe the problem and resulting behavior. Link the story or relevant product source.

## Motivation

Explain why this change is needed.

## Changes

List the changes that matter to the reviewer. Include a migration map and approved deletions for documentation reorganizations.

## Testing

Record commands actually executed and their results. Separate pre-existing failures and environment limitations.

## Risks

Describe unresolved risks, dependencies and follow-up work.

## Checklist

- [ ] The responsible documentation and indexes are updated; `pnpm docs:check` passes.
- [ ] Relevant typecheck, lint and tests were executed and their results recorded.
- [ ] Data model changes include the required migration and production SQL checks (when applicable).
- [ ] Interface changes follow the [quality checklist](../packages/brand/docs/05-calidad/quality-checklist.md) (when applicable).
- [ ] Review and QA are independent of implementation; no automatic merge is requested.
