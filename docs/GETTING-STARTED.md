# Getting Started with DOFTool

This guide will help you get DOFTool up and running in minutes. Whether you're creating a new family or joining an existing one, follow these simple steps.

---

## Table of Contents

1. [Installation](#installation)
2. [Creating a Family](#creating-a-family)
3. [Joining a Family](#joining-a-family)
4. [Using the Calendar](#using-the-calendar)
5. [Managing Tasks](#managing-tasks)
6. [Syncing Devices](#syncing-devices)
7. [Next Steps](#next-steps)

---

## Installation

### Download

Download the latest release for your platform:

| Platform    | Download                                                                 | Requirements                |
| ----------- | ------------------------------------------------------------------------ | --------------------------- |
| **Windows** | [DOFTool-win.zip](https://github.com/asterixix/DOFTool/releases/latest)  | Windows 10/11 (64-bit)      |
| **macOS**   | [DOFTool.dmg](https://github.com/asterixix/DOFTool/releases/latest)      | macOS 11 Big Sur+           |
| **Linux**   | [DOFTool.AppImage](https://github.com/asterixix/DOFTool/releases/latest) | Ubuntu 20.04+ or equivalent |

### Install

**Windows:**

1. Extract `DOFTool-win.zip`
2. Run `DOFTool.exe`

**macOS:**

1. Open `DOFTool.dmg`
2. Drag DOFTool to Applications
3. Right-click → Open (first time only, to bypass Gatekeeper)

**Linux:**

1. Make executable: `chmod +x DOFTool.AppImage`
2. Run: `./DOFTool.AppImage`

---

## Creating a Family

If you're setting up DOFTool for your family for the first time:

### Step 1: Launch DOFTool

Open the application. You'll see the welcome screen.

### Step 2: Click "Create Family"

Enter the following information:

| Field           | Description                                    | Example                |
| --------------- | ---------------------------------------------- | ---------------------- |
| **Family Name** | Your family's display name                     | "The Smiths"           |
| **Your Name**   | Your display name                              | "John"                 |
| **Passphrase**  | A strong password (16+ characters recommended) | Use a memorable phrase |

> ⚠️ **Important**: Write down your passphrase and store it safely! It cannot be recovered if lost. This passphrase encrypts all your family's data.

### Step 3: Complete Setup

Click **Create** and wait for initialization. Your family is now ready!

### Passphrase Tips

A good passphrase:

- Is at least 16 characters long
- Contains a mix of words, numbers, and symbols
- Is memorable but not guessable
- Example: `correct-horse-battery-staple-2024!`

---

## Joining a Family

If someone in your family has already created a DOFTool family:

### Step 1: Get an Invite

Ask the family admin to generate an invite. They can share it as:

- **QR Code** - Scan with your device's camera
- **Invite Link** - Copy and paste

### Step 2: Click "Join Family"

Choose your method:

**Using QR Code:**

1. Click "Scan QR Code"
2. Point your camera at the QR code
3. Wait for verification

**Using Invite Link:**

1. Click "Enter Invite Code"
2. Paste the invite link
3. Click "Join"

### Step 3: Enter Your Details

| Field           | Description                                  |
| --------------- | -------------------------------------------- |
| **Your Name**   | How you'll appear to family members          |
| **Device Name** | Name for this device (e.g., "John's Laptop") |

### Step 4: Wait for Approval

Depending on family settings, the admin may need to approve your join request.

---

## Using the Calendar

### Creating a Calendar

1. Click **Calendar** in the sidebar
2. Click **+ New Calendar**
3. Enter:
   - Calendar name (e.g., "Family Events")
   - Color
   - Default sharing permissions

### Creating an Event

1. Click on a date or click **+ New Event**
2. Fill in event details:

| Field           | Description                                |
| --------------- | ------------------------------------------ |
| **Title**       | Event name                                 |
| **Date & Time** | When the event occurs                      |
| **Location**    | Physical address or video link             |
| **Description** | Additional details                         |
| **Reminder**    | When to notify (e.g., 30 min before)       |
| **Recurrence**  | For repeating events (daily, weekly, etc.) |

3. Click **Save**

### Sharing Events

Events can have different visibility levels:

| Level       | Who Can See                        |
| ----------- | ---------------------------------- |
| **Family**  | All family members                 |
| **Private** | Only you                           |
| **Public**  | Anyone with access to the calendar |

### Import/Export

- **Import**: Click ⚙️ → Import → Select `.ics` file
- **Export**: Click ⚙️ → Export → Save `.ics` file

---

## Managing Tasks

### Creating a Task List

1. Click **Tasks** in the sidebar
2. Click **+ New List**
3. Enter list name and color

### Creating a Task

1. Select a task list
2. Click **+ Add Task** or press `Enter` in the quick-add field
3. Fill in details:

| Field        | Description                     |
| ------------ | ------------------------------- |
| **Title**    | Task description                |
| **Due Date** | When it's due                   |
| **Priority** | None, Low, Medium, High, Urgent |
| **Assignee** | Family member responsible       |
| **Subtasks** | Break down into smaller steps   |

### Task Views

| View         | Best For                              |
| ------------ | ------------------------------------- |
| **List**     | Quick overview and checking off items |
| **Board**    | Kanban-style progress tracking        |
| **Calendar** | Seeing tasks alongside events         |

### Task Shortcuts

| Shortcut | Action            |
| -------- | ----------------- |
| `Enter`  | Add new task      |
| `Space`  | Toggle completion |
| `Delete` | Delete task       |
| `E`      | Edit task         |

---

## Syncing Devices

DOFTool syncs automatically when devices are on the same network.

### How Sync Works

1. **Discovery**: Devices find each other via mDNS (like AirDrop)
2. **Connection**: Direct peer-to-peer link established
3. **Sync**: Changes merge automatically using CRDTs

### Sync Status Indicators

| Icon | Status                  |
| ---- | ----------------------- |
| 🟢   | Synced and connected    |
| 🟡   | Syncing in progress     |
| 🔴   | Offline or disconnected |
| ⚪   | No other devices found  |

### Forcing a Sync

If sync seems stuck:

1. Click the sync icon in the status bar
2. Click **Force Sync**

### Sync Requirements

- Devices must be on the **same WiFi network**
- Firewall must allow mDNS traffic (UDP port 5353)
- Both devices must be running DOFTool

> 💡 **Tip**: If devices can't find each other, try temporarily disabling your firewall to test connectivity.

---

## Next Steps

### Explore Features

- **Settings** → Customize your preferences
- **Family** → Manage members and devices
- **Profile** → Update your display name and avatar

### Learn More

- [Architecture](ARCHITECTURE.md) - How DOFTool works under the hood
- [Security](SECURITY.md) - Understand the encryption model
- [Troubleshooting](TROUBLESHOOTING.md) - Solutions to common issues

### Get Help

- **In-App Help**: Click ? icon
- **GitHub Issues**: [Report bugs](https://github.com/asterixix/DOFTool/issues)
- **Discussions**: [Ask questions](https://github.com/asterixix/DOFTool/discussions)

---

## Quick Reference Card

### Keyboard Shortcuts

| Shortcut       | Action                       |
| -------------- | ---------------------------- |
| `Ctrl/Cmd + N` | New item (context-dependent) |
| `Ctrl/Cmd + S` | Save                         |
| `Ctrl/Cmd + F` | Search                       |
| `Ctrl/Cmd + ,` | Settings                     |
| `Esc`          | Close dialog/cancel          |

### Navigation

| Shortcut     | Go To    |
| ------------ | -------- |
| `G` then `C` | Calendar |
| `G` then `T` | Tasks    |
| `G` then `E` | Email    |
| `G` then `S` | Settings |

---

## Congratulations! 🎉

You're now ready to use DOFTool. Start by:

1. ✅ Creating your first calendar
2. ✅ Adding a few tasks
3. ✅ Inviting family members
4. ✅ Setting up sync on another device

Welcome to organized family life with privacy by default!
