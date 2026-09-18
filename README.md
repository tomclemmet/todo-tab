# Todo Tab

A local HTML page for a new-tab to-do board: **Today**, **This Week**, and
**Next Week**.

- Tasks persist in `localStorage`, scoped to this file's path.
- Drag tasks between columns, or add/check off/delete them directly.
- Every time the page loads, it checks the stored date against today's date:
  - If the calendar day has changed since it was last opened, all
    **Today** tasks move to **This Week**.
  - If the calendar week (Monday-start) has changed, all **This Week** tasks
    move to **Next Week**.
  - There's no background process — this check only runs on page load, so
    it always catches up correctly no matter how long the browser was
    closed.
- Nothing ever moves out of **Next Week** automatically; pulling tasks
  forward into **This Week** or **Today** is a manual drag, by design.

## Setup

This is a plain static page, not a Chrome extension — point a third-party
"custom new tab" extension at `newtab.html` instead of maintaining a
bespoke extension:

1. Install a new-tab redirector from the Chrome Web Store, e.g.
   [New Tab Redirect](https://chromewebstore.google.com/detail/icpgjfneehieebagbmdbhnlpiopdcmna).
2. Point it at this file using a `file://` URL, e.g.
   `file:///home/you/todo-tab/newtab.html` (adjust the path to wherever you
   cloned this repo).
3. Chrome may require **"Allow access to file URLs"** to be enabled for
   that extension (`chrome://extensions` → the extension's **Details**
   page) before it can load a local file.
4. Open a new tab to see the board.

Because the redirector always points at the same file path, `localStorage`
persists normally across tabs and restarts.
