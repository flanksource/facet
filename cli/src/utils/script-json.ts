const UNSAFE_SCRIPT_CHARS: Record<string, string> = {
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serialize a value as a JavaScript literal that is safe to splice into
 * generated source or an inline `<script>`: `<` and the U+2028/U+2029 line
 * separators are escaped, so the value cannot close the script context.
 */
export function scriptJSON(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error(`scriptJSON: ${typeof value} is not JSON-serializable`);
  return json.replace(/[<\u2028\u2029]/g, (char) => UNSAFE_SCRIPT_CHARS[char]!);
}
