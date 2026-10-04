export function pageMetadata(
  origin: string,
  title: string,
  description: string,
  pathname: string,
  index = true,
) {
  return {
    title,
    description,
    canonical: new URL(pathname, origin).href,
    robots: index ? "index,follow" : "noindex,follow",
  };
}
export const xmlEscape = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
