import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const markdown = new MarkdownIt({ html: false, linkify: false });
export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function renderMarkdown(value: string) {
  const tokens = markdown.parse(value, {});
  // Start each instruction document below its h2 section, even when the author
  // begins with ## rather than #. Preserve relative levels, capped at h6.
  const firstLevel = tokens.reduce(
    (level, token) =>
      token.type === "heading_open"
        ? Math.min(level, Number(token.tag.slice(1)))
        : level,
    6,
  );
  for (const token of tokens)
    if (token.type === "heading_open" || token.type === "heading_close")
      token.tag = `h${Math.min(6, Number(token.tag.slice(1)) - firstLevel + 3)}`;
  return sanitizeHtml(markdown.renderer.render(tokens, markdown.options, {}), {
    allowedTags: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "em",
      "strong",
      "a",
      "hr",
      "br",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: { a: ["href", "rel"] },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes) => ({
        tagName: "a",
        attribs: {
          ...(safeExternalUrl(attributes.href || "")
            ? { href: safeExternalUrl(attributes.href || "")! }
            : {}),
          rel: "nofollow noopener noreferrer",
        },
      }),
    },
  });
}
