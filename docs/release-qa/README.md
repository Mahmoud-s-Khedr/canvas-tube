# Fedora hardware release evidence

Copy [TEMPLATE.md](TEMPLATE.md) for each release/compositor pairing, for example
`0.1.0-gnome-wayland.md` and `0.1.0-kde-wayland.md`. Record actual packaged AppImage
hardware results, package checksum and commit. Keep evidence files or stable links
alongside the record, and link failures to issues.

No hardware evidence has been recorded by this testing implementation. Fedora release
QA remains incomplete. Compiled and packaged X11 smoke tests provide separate automated
evidence; they do not verify pressure, palm rejection or native Wayland behavior.
Windows automation runs in CI; Windows manual release QA is deferred.
