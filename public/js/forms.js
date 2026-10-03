document.querySelector("[data-error-summary]")?.focus();
document
  .querySelector("[data-password-toggle]")
  ?.addEventListener("click", (event) => {
    const input = document.getElementById("password");
    const shown = input.type === "password";
    input.type = shown ? "text" : "password";
    event.currentTarget.setAttribute("aria-pressed", String(shown));
    event.currentTarget.textContent = shown ? "Hide password" : "Show password";
  });
document.querySelectorAll("form").forEach((form) =>
  form.addEventListener("submit", () => {
    const button = form.querySelector('[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Please wait…";
    }
  }),
);
window.addEventListener("pageshow", () =>
  document.querySelectorAll('button[type="submit"]').forEach((button) => {
    if (button.disabled) window.location.reload();
  }),
);
