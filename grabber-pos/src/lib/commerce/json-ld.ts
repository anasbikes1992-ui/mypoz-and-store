/** Safe JSON-LD embedding — never let `</script>` break out of the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
