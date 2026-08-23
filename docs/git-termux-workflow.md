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

For GitHub HTTPS remotes, use a GitHub token when prompted for password. For SSH remotes, generate or reuse an SSH key:

```bash
ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub
```

Then add the public key to GitHub.

## Initialize the Project

```bash
cd ~/work/projects/python/flight-log-viewer
git init
git branch -M main
git status
```

## Daily Work Loop

```bash
git status
git add .
git commit -m "Describe the change"
```

Before a risky change:

```bash
git switch -c feature/some-change
```

After checking changes:

```bash
git diff
git diff --staged
```

## Remote Repository

After creating an empty GitHub repo:

```bash
git remote add origin git@github.com:YOUR_USER/flight-log-viewer.git
git push -u origin main
```

If using HTTPS:

```bash
git remote add origin https://github.com/YOUR_USER/flight-log-viewer.git
git push -u origin main
```

## Data Policy

Do not commit raw flight logs by default:

- `.BIN`
- `.tlog`
- `.rlog`
- duplicate downloaded archives

Keep raw files under `data/raw/` locally and commit only small derived samples or metadata summaries unless intentionally sharing a dataset.

