// Classic, synchronous script: no imports/exports; resolve before CSS/first paint.
(() => {
  let preference = "system";
  try {
    const saved = localStorage.getItem("skillmart.theme");
    if (saved === "light" || saved === "dark") preference = saved;
  } catch {
    /* System CSS is also the no-script fallback. */
  }
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
})();
