export function cleanScholarlyText(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  let decoded = value;

  /*
    Scholarly metadata can occasionally
    contain HTML entities encoded more than
    once, for example:

    &amp;lt;italic&amp;gt;

    Decode repeatedly until the text stops
    changing, with a small safety limit.
  */
  for (let i = 0; i < 5; i += 1) {
    const previous = decoded;

    decoded = decoded
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&apos;", "'")
      .replaceAll("&nbsp;", " ")
      .replace(
        /&#(\d+);/g,
        (_match, code) =>
          String.fromCodePoint(
            Number(code)
          )
      )
      .replace(
        /&#x([0-9a-fA-F]+);/g,
        (_match, code) =>
          String.fromCodePoint(
            parseInt(code, 16)
          )
      );

    if (decoded === previous) {
      break;
    }
  }

  /*
    Do not render third-party HTML.
    Remove any tags after decoding.
  */
  return decoded
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}