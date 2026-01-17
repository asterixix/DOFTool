# DOFTool Troubleshooting Guide

This guide helps you solve common issues with DOFTool. If your problem isn't listed here, please [open an issue](https://github.com/asterixix/DOFTool/issues).

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Startup Problems](#startup-problems)
3. [Sync Issues](#sync-issues)
4. [Family & Invitations](#family--invitations)
5. [Calendar Problems](#calendar-problems)
6. [Task Issues](#task-issues)
7. [Performance Issues](#performance-issues)
8. [Data & Backup](#data--backup)
9. [Getting Help](#getting-help)

---

## Installation Issues

### Windows: "Windows protected your PC" warning

**Problem:** SmartScreen blocks the app from running.

**Solution:**

1. Click "More info"
2. Click "Run anyway"

This happens because DOFTool isn't code-signed yet. The app is safe - you can verify by checking the source code.

---

### macOS: "DOFTool can't be opened because it is from an unidentified developer"

**Problem:** Gatekeeper blocks the app.

**Solution:**

1. Right-click (or Control-click) on DOFTool
2. Select "Open" from the context menu
3. Click "Open" in the dialog

Or in Terminal:

```bash
xattr -cr /Applications/DOFTool.app
```

---

### macOS: "DOFTool is damaged and can't be opened"

**Problem:** Quarantine attribute is set.

**Solution:**

```bash
xattr -cr /Applications/DOFTool.app
```

---

### Linux: AppImage won't run

**Problem:** Missing execute permission or dependencies.

**Solution:**

```bash
# Add execute permission
chmod +x DOFTool.AppImage

# Install FUSE if needed (Ubuntu/Debian)
sudo apt install libfuse2

# Run
./DOFTool.AppImage
```

---

### Linux: Tray icon not showing

**Problem:** Missing system tray support.

**Solution:**

```bash
# Ubuntu/GNOME
sudo apt install gnome-shell-extension-appindicator

# Then log out and back in
```

---

## Startup Problems

### App shows blank white screen

**Problem:** Renderer failed to load.

**Solutions:**

1. **Clear cache and restart:**
   - Windows: Delete `%APPDATA%\DOFTool\Cache`
   - macOS: Delete `~/Library/Application Support/DOFTool/Cache`
   - Linux: Delete `~/.config/DOFTool/Cache`

2. **Check for GPU issues:**
   - Try running with `--disable-gpu` flag
   - Windows: Create shortcut with `DOFTool.exe --disable-gpu`

3. **Reinstall the app**

---

### "Failed to initialize encryption" error

**Problem:** libsodium failed to load.

**Solutions:**

1. **Reinstall the app** - files may be corrupted

2. **Check antivirus** - some antivirus software blocks crypto libraries

3. **Windows:** Install Visual C++ Redistributable:
   - Download from [Microsoft](https://aka.ms/vs/17/release/vc_redist.x64.exe)

---

### App crashes on startup

**Problem:** Corrupted data or configuration.

**Solution:**

1. Backup your data folder first
2. Try resetting the app:
   - Windows: Delete `%APPDATA%\DOFTool`
   - macOS: Delete `~/Library/Application Support/DOFTool`
   - Linux: Delete `~/.config/DOFTool`

> ⚠️ **Warning:** This will delete local data. Make sure to export your calendars/tasks first if possible.

---

## Sync Issues

### Devices can't find each other

**Problem:** mDNS discovery not working.

**Checklist:**

- [ ] Both devices are on the **same WiFi network**
- [ ] Both devices have DOFTool running
- [ ] Firewall allows mDNS traffic (UDP port 5353)
- [ ] Router allows multicast traffic

**Solutions:**

1. **Check firewall:**
   - Windows: Allow DOFTool through Windows Firewall
   - macOS: System Preferences → Security → Firewall → Allow DOFTool
   - Linux: `sudo ufw allow 5353/udp`

2. **Restart mDNS service:**
   - Windows: Restart "Bonjour Service" or "DNS Client"
   - macOS: `sudo killall -HUP mDNSResponder`
   - Linux: `sudo systemctl restart avahi-daemon`

3. **Try manual IP connection** (if available in Settings)

---

### Sync stuck at "Syncing..."

**Problem:** Sync process hangs.

**Solutions:**

1. **Force sync:** Click sync icon → "Force Sync"

2. **Restart the app** on both devices

3. **Check network:**
   - Are devices on the same subnet?
   - Is there a VPN running? (Can interfere with local discovery)

4. **Check logs:**
   - Open DevTools: `Ctrl/Cmd + Shift + I`
   - Look for errors in Console tab

---

### Sync conflicts or data not appearing

**Problem:** Data changes not syncing correctly.

**Solutions:**

1. **Wait a moment** - CRDTs resolve conflicts automatically but may take a few seconds

2. **Force sync** on all devices

3. **Check if devices are connected:**
   - Status bar should show connected peer count

4. **Verify family membership:**
   - Both devices must be in the same family
   - Check Settings → Family → Devices

---

### "Encryption key mismatch" error

**Problem:** Device has wrong family key.

**Solutions:**

1. **Re-join the family:**
   - Leave the family (Settings → Family → Leave)
   - Get a new invite from admin
   - Join again

2. **If you're the admin:**
   - Your passphrase may have been entered incorrectly
   - Try the correct passphrase

---

## Family & Invitations

### Invite QR code won't scan

**Problem:** QR code not recognized.

**Solutions:**

1. **Increase screen brightness**
2. **Hold camera steady** at arm's length
3. **Try manual code entry** instead
4. **Generate a new invite** - old one may have expired

---

### "Invite expired" error

**Problem:** Invite token past expiration.

**Solution:** Ask the admin to generate a new invite. Default expiration is 24 hours.

---

### Can't remove a family member

**Problem:** Remove button not working or greyed out.

**Possible causes:**

- You may not have admin privileges
- Can't remove yourself (use "Leave Family" instead)
- Can't remove the last admin

**Solution:** Ensure you're an admin, or ask an admin to remove the member.

---

### Joined family but can't see any data

**Problem:** Initial sync not completed.

**Solutions:**

1. **Wait for sync** - initial sync can take a minute for large families

2. **Check connection:**
   - Is an admin device online?
   - Are you on the same network?

3. **Force sync**

---

## Calendar Problems

### Events not showing on correct date

**Problem:** Timezone mismatch.

**Solutions:**

1. **Check your device timezone** - must match your actual location

2. **Check event timezone:**
   - Open event → Check timezone setting
   - Imported events may have wrong timezone

3. **Re-import with correct timezone** if imported from iCal

---

### Recurring events showing wrong dates

**Problem:** Recurrence rule calculation error.

**Solutions:**

1. **Edit the event** and re-save the recurrence rule

2. **Check for DST issues:**
   - Events near daylight saving time changes may shift

3. **Delete and recreate** the recurring event

---

### Can't import iCal file

**Problem:** Import fails or events missing.

**Possible causes:**

- File encoding not UTF-8
- Invalid iCal format
- File too large

**Solutions:**

1. **Check file format:**
   - Must be `.ics` file
   - Open in text editor, should start with `BEGIN:VCALENDAR`

2. **Try smaller import:**
   - Split large files
   - Import one calendar at a time

3. **Check for errors** in the import dialog

---

### Reminders not working

**Problem:** No notifications for event reminders.

**Checklist:**

- [ ] Notifications enabled in Settings
- [ ] System notifications allowed for DOFTool
- [ ] Reminder was set on the event
- [ ] Device was on at reminder time

**Solutions:**

1. **Check app settings:** Settings → Notifications → Enable

2. **Check system settings:**
   - Windows: Settings → System → Notifications
   - macOS: System Preferences → Notifications
   - Linux: Check your DE notification settings

---

## Task Issues

### Tasks not saving

**Problem:** Created tasks disappear.

**Solutions:**

1. **Check permissions** - you may only have view access to the list

2. **Wait for sync** - task may be syncing

3. **Check for validation errors** - title may be too long

---

### Can't assign task to family member

**Problem:** Member not in assignee dropdown.

**Solutions:**

1. **Refresh the member list**
2. **Check member status** - must be "active" not "invited"
3. **Check your permissions** - may not have edit access

---

### Completed tasks reappearing

**Problem:** Tasks marked complete become incomplete again.

**Cause:** Usually a sync conflict where another device had the task as incomplete.

**Solution:** Mark complete again. CRDT will eventually settle on the correct state.

---

## Performance Issues

### App running slowly

**Problem:** UI lag or high CPU usage.

**Solutions:**

1. **Reduce data:**
   - Archive old task lists
   - Delete completed tasks periodically
   - Export and remove old calendars

2. **Disable animations:**
   - Settings → Accessibility → Reduce motion

3. **Check for sync loops:**
   - High network activity may indicate sync issues
   - Restart the app

4. **Clear cache:**
   - Settings → Advanced → Clear Cache

---

### High memory usage

**Problem:** DOFTool using too much RAM.

**Solutions:**

1. **Restart the app** periodically

2. **Close unused windows/dialogs**

3. **Reduce email sync** (if enabled):
   - Sync fewer messages
   - Increase sync interval

---

### App freezing during sync

**Problem:** UI becomes unresponsive during sync.

**Solutions:**

1. **Wait for sync to complete** - large syncs may take time

2. **Check Performance settings:**
   - Settings → Advanced → Sync throttling

3. **Update to latest version** - sync performance is continuously improved

---

## Data & Backup

### How to backup my data

**Manual backup:**

1. Export calendars: Calendar → Settings → Export All
2. Export tasks: Tasks → Settings → Export All
3. Copy data folder:
   - Windows: `%APPDATA%\DOFTool`
   - macOS: `~/Library/Application Support/DOFTool`
   - Linux: `~/.config/DOFTool`

---

### How to restore from backup

**From exports:**

1. Install DOFTool on new device
2. Create or join family
3. Import calendars/tasks from exported files

**From data folder:**

1. Close DOFTool
2. Copy backup to data location
3. Restart DOFTool

> ⚠️ **Note:** Data folder backup only works on same device or same OS.

---

### Data corrupted

**Problem:** "Failed to load data" or similar errors.

**Solutions:**

1. **Try to sync from another device:**
   - If another family device has good data, sync should restore

2. **Restore from backup** (if available)

3. **Reset and start fresh:**
   - Export what you can first
   - Delete data folder
   - Restart app

---

### Lost my passphrase

**Problem:** Forgot family encryption passphrase.

**Reality:** The passphrase **cannot be recovered**. This is by design for security.

**Options:**

1. **If other devices are logged in:**
   - They still work, passphrase is cached
   - Export all data to iCal/JSON
   - Create new family with new passphrase
   - Import data

2. **If no devices are logged in:**
   - Data is permanently encrypted
   - Must start fresh with new family

---

## Getting Help

### Before asking for help

1. ✅ Check this troubleshooting guide
2. ✅ Search [existing issues](https://github.com/asterixix/DOFTool/issues)
3. ✅ Try restarting the app
4. ✅ Try updating to latest version

### Reporting a bug

Include the following information:

```
**DOFTool Version:** [e.g., 0.1.0]
**OS:** [e.g., Windows 11, macOS 14.2, Ubuntu 22.04]
**Description:** [What happened?]
**Expected:** [What should have happened?]
**Steps to reproduce:**
1. [First step]
2. [Second step]
3. [...]

**Logs:** [If applicable, paste relevant logs from DevTools Console]
```

### Where to get help

- **GitHub Issues:** [Bug reports](https://github.com/asterixix/DOFTool/issues)
- **GitHub Discussions:** [Questions & ideas](https://github.com/asterixix/DOFTool/discussions)
- **Email:** artur@sendyka.dev

---

## Diagnostic Information

### Finding version info

- In app: Settings → About
- Or: Help menu → About DOFTool

### Finding logs

**DevTools Console:**

1. Press `Ctrl/Cmd + Shift + I`
2. Go to Console tab
3. Look for errors (red text)

**Log files:**

- Windows: `%APPDATA%\DOFTool\logs`
- macOS: `~/Library/Logs/DOFTool`
- Linux: `~/.config/DOFTool/logs`

### System information to include

```bash
# Node.js version
node --version

# Electron version (shown in About dialog)

# OS details
# Windows: winver
# macOS: sw_vers
# Linux: cat /etc/os-release
```
