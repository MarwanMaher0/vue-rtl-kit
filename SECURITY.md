# Security policy

## Supported versions

Security fixes go into `main` and the next release. Please check that the problem still exists
on the latest release or on `main` before reporting it.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub:

1. Open the [Security tab](https://github.com/MarwanMaher0/vue-rtl-kit/security) of this repository.
2. Choose **Report a vulnerability**
   ([direct link](https://github.com/MarwanMaher0/vue-rtl-kit/security/advisories/new)).
3. Include the version or commit, the steps to reproduce, and what an attacker could do with it.

You will get a reply in the advisory thread, updates while a fix is prepared, and credit in the
published advisory unless you would rather not be named.

## Scope

In scope, for example:

- `<BidiText>`, `v-rtl` or any other API rendering its input as HTML instead of text;
- text passed through `<BidiText>` or `isolateRuns` whose own bidi control characters escape
  the isolate and visually reorder the surrounding UI, for example to disguise a URL or an
  amount.
