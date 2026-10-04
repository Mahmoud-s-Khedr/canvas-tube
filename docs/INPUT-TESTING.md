# Fedora tablet release QA

A release requires hardware records for **GNOME Wayland and KDE Wayland** using the
packaged AppImage. Start with the [evidence template](release-qa/TEMPLATE.md) and follow
the [recording instructions](release-qa/README.md). Every check starts incomplete;
only observed results with evidence can change that status. Windows manual release
QA is deferred; Windows Electron automation remains in CI.

Before testing, record the package version, full commit, SHA-256, Fedora/kernel,
compositor version, tablet and driver, display mapping/scaling, tester and date.
Confirm `XDG_SESSION_TYPE=wayland`; Xvfb/X11 smoke results cannot replace these records.
Launch the AppImage as a normal desktop user.

Use Fedora Settings → Drawing Tablet on GNOME, or System Settings → Drawing Tablet
on KDE, to map the device to the drawing display. Driver UI names vary by version;
record the settings actually used. Identify the USB device with `lsusb`. If available,
use `libinput list-devices` and `evtest` to distinguish driver/input problems from
application behavior. These diagnostics do not establish application support.

Open CanvasTube's Stylus Inspector and record pointer type, pressure, tilt and buttons
while performing the real drawing checks. Compare inspector values with visible stroke
behavior. Do not assume tablet brand, pressure resolution, tilt support or palm rejection
from a generic pen event. Test the eraser, every barrel button and tool restoration.
Record unsupported controls explicitly with issue links.

Complete shortcut, editable-field suppression, zoom/pan, native clipboard, PNG/SVG,
project save/reopen, PDF annotation, and offline font/asset checks. Include a continuous
drawing session of at least 60 minutes, with timestamps, saved artifacts, observed
responsiveness and any crashes. Record each result individually for both compositors.

A release stays QA-incomplete while either compositor record or required evidence is
missing. Link failures and unsupported capabilities to issues and record the release
decision; automation cannot make that decision from synthetic input or simulated memory.
