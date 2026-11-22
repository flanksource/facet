/** Runs via page.evaluate in the trusted host, outside the template frame. */
export function preparePDFSnapshot(snapshot: string): string {
  const document = new DOMParser().parseFromString(snapshot, 'text/html');
  const removable = 'script, iframe, frame, object, embed, link, base, template, meta[http-equiv]';
  document.querySelectorAll(removable).forEach(element => element.remove());
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || /^javascript:/i.test(attribute.value.replace(/[\x00-\x20]/g, ''))) {
        element.removeAttributeNode(attribute);
      }
    }
  }
  const csp = document.createElement('meta');
  csp.httpEquiv = 'Content-Security-Policy';
  csp.content = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  document.head.prepend(csp);
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}
