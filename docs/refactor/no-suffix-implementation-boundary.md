# No-Suffix Refactor Boundary

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

## Decision

The clean refactor should not use path suffixes such as `viewer-v2/` or `public-data-v2/`.

The independent implementation will use the normal project paths:

```text
scripts/
viewer/
public-data/
```

The old implementation remains recoverable from git history only. It should not remain as a parallel runtime tree in the working branch.

## Active Paths

New backend:

```text
scripts/flv_build.py
scripts/flv/
```

New frontend:

```text
viewer/index.html
viewer/css/
viewer/js/
```

Generated output:

```text
public-data/
```

## Rule

New implementation code must not import old deleted scripts or old `viewer/index.html` logic. If old behavior is needed for reference, use git history during development only.

