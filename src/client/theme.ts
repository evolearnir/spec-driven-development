(() => {
  const root = document.documentElement;
  const selector = document.querySelector<HTMLSelectElement>("#theme");
  const control = document.querySelector<HTMLElement>("[data-theme-control]");
  if (!selector || !control) return;
  const system = matchMedia("(prefers-color-scheme: dark)");
  let preference = root.dataset.themePreference || "system";
  const apply = () => {
    root.dataset.themePreference = preference;
    root.dataset.theme =
      preference === "system"
        ? system.matches
          ? "dark"
          : "light"
        : preference;
    selector.value = preference;
  };
  apply();
  control.hidden = false;
  selector.addEventListener("change", () => {
    preference = selector.value;
    try {
      if (preference === "system") localStorage.removeItem("skillmart.theme");
      else localStorage.setItem("skillmart.theme", preference);
    } catch {
      /* Keep this document's choice when storage is unavailable. */
    }
    apply();
  });
  system.addEventListener("change", () => {
    if (preference === "system") apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== "skillmart.theme" && event.key !== null) return;
    preference =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : "system";
    apply();
  });
})();
