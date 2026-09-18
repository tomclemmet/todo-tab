# Todo Tab

A Chrome extension that replaces the new tab page with a simple to-do board:
**Today**, **This Week**, and **Next Week**.

- Tasks persist in `chrome.storage.local`.
- Drag tasks between columns, or add/check off/delete them directly.
- Every time a new tab is opened, the page checks the stored date against
  today's date:
  - If the calendar day has changed since the page was last opened, all
    **Today** tasks move to **This Week**.
  - If the calendar week (Monday-start) has changed, all **This Week** tasks
    move to **Next Week**.
  - There's no background process — this check only runs when a new tab is
    actually opened, so it always catches up correctly no matter how long
    the browser was closed.
- Nothing ever moves out of **Next Week** automatically; pulling tasks
  forward into **This Week** or **Today** is a manual drag, by design.

## Installing (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this project's folder.
4. Open a new tab to see the board.

Chrome will use a generic default icon since no custom icon is included.
