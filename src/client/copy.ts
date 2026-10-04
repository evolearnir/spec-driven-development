(() => {
  const button = document.querySelector<HTMLButtonElement>("[data-copy]");
  const raw = document.querySelector<HTMLTextAreaElement>("#raw-body");
  const status = document.querySelector<HTMLElement>("[data-copy-status]");
  const fallback = document.querySelector<HTMLDetailsElement>(
    "[data-copy-fallback]",
  );
  if (!button || !raw || !status || !fallback) return;
  button.hidden = false;
  let copying = false;
  button.addEventListener("click", async () => {
    if (copying) return;
    copying = true;
    button.setAttribute("aria-disabled", "true");
    status.textContent = "Copying instructions…";
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      // HTML textareas normalize CRLF and strip an initial newline. The escaped
      // JSON attribute preserves the stored body exactly for clipboard writes.
      await navigator.clipboard.writeText(
        JSON.parse(raw.dataset.copyBody || '""') as string,
      );
      status.textContent = "Instructions copied.";
    } catch {
      fallback.open = true;
      status.textContent =
        "Clipboard unavailable. Select the original instructions below and use your device’s copy command.";
    } finally {
      copying = false;
      button.removeAttribute("aria-disabled");
    }
  });
})();
