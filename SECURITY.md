# Security and private reports

This is an early local alpha. The server binds to `127.0.0.1`; the supported trial is
one user on the same machine. A public server, shared deployment, HTTPS/TURN service,
or multi-user account system has separate unfinished roadmap gates. Do not describe
this alpha as a supported internet deployment.

Use GitHub's **Report a vulnerability** entry in the repository's Security tab:
[private vulnerability reports](https://github.com/asb108/opentavus/security/advisories/new).
If that entry is unavailable, ask [asb108](https://github.com/asb108) for a private
channel. Include the affected commit, a minimal synthetic reproduction, impact,
and relevant environment details. Keep credentials, real conversations and personal
media out of reports. Do not open a public issue containing exploit details.

Only the current `main` alpha receives fixes. There is no promised response SLA.
Maintainers will assess a report, prepare a fix and regression evidence, and coordinate
disclosure with the reporter where possible.

Current boundaries include an origin/host check, a separate secret for each local
call, closed request/event schemas, bounded media and tool payloads, a fixed teaching
tool set, and safe formula/diagram rendering. These measures have specific tests;
they are not a claim of a completed external security audit.
