const SVG_SPRITE = "/assets/svg/icons.svg";

/** Return an accessible, CSS-stylable reference to a centrally maintained SVG symbol. */
export function icon(name, { width = 24, height = width, className = "", decorative = true, label = "" } = {}) {
  const safeName = String(name).replace(/[^a-z0-9-]/gi, "");
  if (!safeName) return "";
  const classAttribute = className ? ` class="${escapeAttribute(className)}"` : "";
  const accessibility = decorative ? ' aria-hidden="true" focusable="false"' : ` role="img" aria-label="${escapeAttribute(label)}"`;
  return `<svg${classAttribute} width="${escapeAttribute(width)}" height="${escapeAttribute(height)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"${accessibility}><use href="${SVG_SPRITE}#${safeName}"></use></svg>`;
}

function escapeAttribute(value) {
  return String(value).replace(/[&"<>]/g, (character) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[character]);
}
