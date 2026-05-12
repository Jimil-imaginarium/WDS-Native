# WDS Vision — Operator Runbook

One-page manual for the factory-floor PC operator. Print this and pin it next to the workstation.

---

## 1. Start the system

1. Open `This PC` → `Desktop` → `wds-native` folder
2. Double-click **`start.bat`**

Two cmd windows pop open:

| Window title | What it is | What's healthy |
|---|---|---|
| **WDS Server** | Python backend | Shows `Uvicorn running on http://0.0.0.0:8000` |
| **WDS Web** | Dashboard frontend | Shows `Local: http://localhost:5173/` |

Don't close these windows while the system runs.

**First-run only:** takes ~10 minutes to install dependencies. Subsequent runs ~15 seconds.

---

## 2. Open the dashboard

1. Open Chrome → go to **http://localhost:5173**
2. Sign in:
   - Email: `admin@wds.local`
   - Password: keep this taped next to the machine (operator should be given the printed password by IT)

You land on the Dashboard showing every configured workstation.

---

## 3. Daily checks

### When you arrive

- Both cmd windows open? → Yes / re-run `start.bat`
- Dashboard reachable at `http://localhost:5173`? → Yes / wait 30 sec after `start.bat`
- WS CONNECTION badge says `live`? → Yes / sign out + sign in
- Each station shows live preview (not black)? → Yes / see "Preview is black" below

### Per-station status badges

| Badge | Means |
|---|---|
| **ACTIVE** | Worker is at the station with hand visible AND moving |
| **IDLE** | Worker is at the station but hand stationary |
| **NO_WORKER** | No worker visible |
| **CAMERA_LOST** | Pi camera unreachable — go check the Pi |

---

## 4. Common operations

### Add a new station

Dashboard → top-right **Admin** → **+ Add station** → fill:
- **Name:** human label, e.g. `Bench-3`
- **Page URL:** the camera's HTTP address, e.g. `http://192.168.4.137:8091/`
- Save.

Worker thread spawns within 5 seconds — preview appears.

### Remove or rename a station

Admin → Stations → click ⋯ menu on the row → Edit / Delete.

### Change the workzone

If the camera sees more than the bench (e.g. floor, doorway), set an ROI rectangle: Admin → Stations → Edit → adjust the four ROI sliders (0.0–1.0 fractions of the frame).

---

## 5. Troubleshooting

### Camera shows `CAMERA_LOST`

The Pi camera isn't reachable. Check in order:

1. Is the Pi powered? (LED on the Pi board)
2. Is the Pi on the same WiFi as this workstation?
3. From cmd: `curl -I http://<pi-ip>:8091/`
   - Returns `HTTP/1.1 200 OK` → Pi is up; check the station's URL in Admin matches the Pi's current IP
   - `Could not connect to server` → Pi is offline; reboot the Pi (`sudo reboot` via SSH, or pull the power for 5 sec)

### Preview is black

1. Click **Sign out**, then **Sign in** again. (Server may have restarted; old auth token invalid.)
2. If still black: in cmd, `taskkill /F /IM python.exe` then re-run `start.bat`.

### FPS is very low (< 3) or `0.00`

1. Check the WDS Server window for `frame error` or `stream error` lines.
2. Restart: close both cmd windows → re-run `start.bat`.

### "Add station" save button greyed out

Page URL must include `http://` and the port (e.g. `http://192.168.4.136:8091/` — note the trailing slash).

---

## 6. Shutdown (end of day)

1. Click **Sign out** in the dashboard
2. Close the **WDS Server** cmd window (X button or Ctrl+C)
3. Close the **WDS Web** cmd window
4. The system can be left running 24/7; daily restart is **not required**.

---

## 7. Password recovery (admin only — call IT)

If the admin password is lost:

1. Close both cmd windows
2. In File Explorer at `wds-native\` → delete the file `wds.db`
3. Re-run `start.bat`
4. The **WDS Server** window prints a new admin password near the top — copy it to the printed cheat-sheet and lock the cheat-sheet away

**WARNING:** deleting `wds.db` also erases all event history and station list. Only do this if password is genuinely lost.

---

## 8. Where to find logs

- **Server logs** — the WDS Server cmd window (per-second: `real_fps state=ACTIVE hand_entities=N person=N skeleton=N`)
- **Event history** — SQLite file `wds-native\wds.db`. Open with [DB Browser for SQLite](https://sqlitebrowser.org/) → `events` table.

---

*Version: 1.0 · For internal use only*
