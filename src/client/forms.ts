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
document.querySelectorAll("form").forEach((form) =>
  form.addEventListener("submit", () => {
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Please wait…";
    }
  }),
);
window.addEventListener("pageshow", () =>
  document
    .querySelectorAll<HTMLButtonElement>('button[type="submit"]')
    .forEach((button) => {
      if (button.disabled) window.location.reload();
    }),
);
