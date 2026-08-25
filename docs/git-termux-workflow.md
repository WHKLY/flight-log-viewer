# Git Workflow on Termux for This Project

Project path:

```bash
cd ~/work/projects/python/flight-log-viewer
```

## One-Time Identity Setup

Check current config:

```bash
git config --global --list
```

If `user.name` or `user.email` is missing:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Daily Work Loop

```bash
git status
git diff
git add README.md docs viewer scripts src pyproject.toml data/README.md .gitignore
git commit -m "Describe the change"
```

Before risky work, create a branch:

```bash
git switch -c feature/some-change
```

## Data Policy

Do not commit raw flight logs or generated viewer JSON by default:

```text
data/raw/
public-data/*.json
public-data/series/
docs/source-review/extracted/
```

These paths are ignored by `.gitignore`. Keep `public-data/.gitkeep` tracked so the generated-data directory exists after clone.

## Release Check

Run from the project root:

```bash
python3 -m py_compile scripts/extract_dataflash_series.py scripts/inspect_logs.py scripts/summarize_dataset.py
python3 scripts/summarize_dataset.py
python3 scripts/inspect_logs.py
python3 scripts/extract_dataflash_series.py
git diff --check
git status --short
```

If the local server is running:

```bash
curl -I http://127.0.0.1:8000/viewer/index.html
```

## First Release Tag

Use semantic versioning. For the first release:

```bash
git tag -a v0.1.0 -m "First tablet flight log viewer release"
git tag --list
```

If a tag was created incorrectly before pushing, delete and recreate it locally:

```bash
git tag -d v0.1.0
```

Do not delete a pushed tag unless you intentionally coordinate that change.

## GitHub Remote

After creating an empty GitHub repository, add one remote.

SSH:

```bash
git remote add origin git@github.com:YOUR_USER/flight-log-viewer.git
git push -u origin main
git push origin v0.1.0
```

HTTPS:

```bash
git remote add origin https://github.com/YOUR_USER/flight-log-viewer.git
git push -u origin main
git push origin v0.1.0
```

For HTTPS, GitHub requires a personal access token instead of an account password. For SSH, add the tablet's public key to GitHub:

```bash
ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub
```
