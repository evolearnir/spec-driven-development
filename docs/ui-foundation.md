# Authentication UI guidance and review

`ui-ux-pro-max` loaded before UI implementation on 2026-10-03.
Design-system query: `developer marketplace authentication minimal`.
The marketplace palette recommendation (purple on pale/white surfaces) fits;
the suggested testimonial/hero carousel does not fit auth scope and was rejected.
A focused retry, `error summary validation --domain ux`, returned verified Web
Forms/Accessibility guidance: focusable error summary, field-linked errors,
inline errors with aria-describedby, and announced errors.

Applied: shared EJS head/footer, semantic labels, native autocomplete/password
managers/paste, password visibility toggle, focusable error summary, no password
repopulation, visible focus rings, skip link, 48px inputs/44px buttons, mobile-first
single column, desktop two columns, system fonts and no external assets/motion.
CSS tokens replace inline visual values. Primary white on #6d28d9, body #24143d
on white, helper #475569 on white, errors #b91c1c on #fef2f2 meet AA contrast.
Input border #82748f is intentionally darker than decorative card borders.

Chrome 154 local review checked 375/768/1440 widths for every auth form with no
horizontal overflow, associated labels, minimum input height, keyboard skip-link
and visible focus, password toggle, empty password after duplicate error, focused
error summary, escaped display names (HTTP checks), and no JavaScript errors.
375/1440 screenshots were visually reviewed. Browser integration used temporary
Playwright tooling outside the repository and a local SMTP receiver; no test
framework or browser dependency was added to application dependencies.
This is a scoped UI review, not a claim of a full assistive-technology WCAG audit.
