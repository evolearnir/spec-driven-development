document.querySelector<HTMLElement>("[data-error-summary]")?.focus();
document
  .querySelector("[data-password-toggle]")
  ?.addEventListener("click", (event) => {
    const input = document.querySelector<HTMLInputElement>("#password");
    const button = event.currentTarget;
    if (!input || !(button instanceof HTMLButtonElement)) return;
    const shown = input.type === "password";
    input.type = shown ? "text" : "password";
    button.setAttribute("aria-pressed", String(shown));
    button.textContent = shown ? "Hide password" : "Show password";
  });
document.querySelectorAll("form").forEach((form) => {
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
  const original = button?.textContent || "Submit";
  const status = form.querySelector<HTMLElement>("[data-form-status]");
  const restore = () => {
    form.removeAttribute("aria-busy");
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
    if (status) status.textContent = "";
  };
  form.addEventListener("submit", (event) => {
    if (event.defaultPrevented) return;
    form.setAttribute("aria-busy", "true");
    if (status) status.textContent = "Loading skills…";
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Please wait…";
    }
    // Submission may be canceled by another listener or browser stop navigation.
    queueMicrotask(() => {
      if (event.defaultPrevented) restore();
    });
    window.setTimeout(restore, 10000);
  });
  window.addEventListener("pageshow", restore);
  window.addEventListener("focus", restore);
});
