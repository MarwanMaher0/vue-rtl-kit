/**
 * Test hosts appended to the vitest browser iframe's <body>. Tests attach
 * their fixtures through `attachHost` and `afterEach` removes only those,
 * leaving whatever the vitest runner keeps in the document untouched.
 */
const hosts = new Set<HTMLElement>()

export function attachHost<T extends HTMLElement>(el: T): T {
  document.body.appendChild(el)
  hosts.add(el)
  return el
}

export function removeHosts(): void {
  for (const el of hosts)
    el.remove()
  hosts.clear()
}
