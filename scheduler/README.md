# Scheduler

This directory contains OS scheduler templates for pi watches. Installed by `install.sh`.

The watches system has two parts:
1. **`watches.yaml`** (in your domain directory) — declares WHAT to do and WHEN (cron schedule)
2. **OS scheduler** (this directory) — fires pi once per minute; pi evaluates which cron entries match

Pi runs headless, checks `watches.yaml`, executes matching watches, and exits. No daemon.

---

## macOS — launchd

Template: `launchd/com.pi.domain.watches.plist`

Install.sh generates and loads a plist per domain:
- Installed to: `~/Library/LaunchAgents/com.pi.domain.<domain-name>.watches.plist`
- Logs at: `~/.pi/logs/pi-watches.log` and `pi-watches.err`

**Manual management:**

```bash
# Check status
launchctl list | grep pi.domain

# Reload after editing watches.yaml (no plist change needed — pi reads watches.yaml each run)
# Watches update automatically — just edit watches.yaml

# Reload plist after editing the plist itself
launchctl unload ~/Library/LaunchAgents/com.pi.domain.<domain-name>.watches.plist
launchctl load ~/Library/LaunchAgents/com.pi.domain.<domain-name>.watches.plist

# Disable (unload without removing)
launchctl unload ~/Library/LaunchAgents/com.pi.domain.<domain-name>.watches.plist

# View logs
tail -f ~/.pi/logs/pi-watches.log
tail -f ~/.pi/logs/pi-watches.err
```

---

## Linux — systemd

Templates:
- `systemd/pi-domain-watches.service` — oneshot service
- `systemd/pi-domain-watches.timer` — fires service every minute

Install.sh generates and enables both units in `~/.config/systemd/user/`:

```bash
# After install.sh runs:
systemctl --user status pi-domain-<domain-name>-watches.timer
```

**Manual management:**

```bash
# Check status
systemctl --user status pi-domain-<domain-name>-watches.timer
systemctl --user status pi-domain-<domain-name>-watches.service

# Watches update automatically — just edit watches.yaml

# Restart the timer (after editing the .timer unit)
systemctl --user daemon-reload
systemctl --user restart pi-domain-<domain-name>-watches.timer

# Disable
systemctl --user disable --now pi-domain-<domain-name>-watches.timer

# View logs
journalctl --user -u pi-domain-<domain-name>-watches.service -f
# Or from the log file:
tail -f ~/.pi/logs/pi-watches.log
```

---

## JSON Mode Watches

Watches with `format: json` pass `--json` to pi. The output is structured JSON rather than prose, making it suitable for piping into other tools or parsing in scripts.

Pi writes the structured result as an observation row (`kind: 'log'`) in memory.db in addition to the configured `output` channel. This means JSON-mode watch results are queryable alongside all other domain observations.

**Example: parse a weekly-metrics watch result**

```bash
# Query the last weekly-metrics result from memory.db
sqlite3 ~/.pi/domain/<domain-name>/memory.db \
  "SELECT content FROM observations WHERE kind='log' ORDER BY ts DESC LIMIT 1;" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['projects'])"
```

**When to use JSON mode:**
- Watches that produce data (counts, lists, metrics) rather than prose for reading
- Watches whose output feeds another automation or dashboard
- Watches where you want the result to be queryable in memory.db with a known structure

**When to use text mode (default):**
- Watches that produce human-readable summaries (`morning-plan`, `weekly-sync`)
- Notification-style watches where the output is read directly by the worker

---

## Troubleshooting

**Watches not firing:**
1. Check that the timer is loaded: `launchctl list | grep pi.domain` (macOS) or `systemctl --user list-timers` (Linux)
2. Check that `pi` is on PATH in the scheduler environment — the plist/service sets `PATH` from `install.sh`; if pi was installed after, reload the scheduler unit
3. Check `pi-watches.err` for pi startup errors

**Watch fired but did nothing:**
1. Verify the cron schedule in `watches.yaml` — use a cron validator; pi uses standard 5-field cron
2. Check `pi-watches.log` for "no matching watches" output
3. Verify `~/.pi/active-domain` contains the correct domain name

**Wrong domain loading:**
Check `~/.pi/active-domain` — it should contain exactly the domain name (one line, no trailing spaces).
