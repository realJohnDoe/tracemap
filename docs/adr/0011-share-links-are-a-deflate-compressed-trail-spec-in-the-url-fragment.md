# Share links are a deflate-compressed trail spec in the URL fragment

A share link is the whole trail spec (ADR-0003) as JSON, compressed with the browser's built-in `CompressionStream('deflate-raw')`, encoded as base64url and put in the URL fragment with a format version: `#t=1.<base64url>`. The fragment never reaches a server, so the web app stays static. The version lets the format change without breaking old links.

Measured on traces of 20–200 steps, the fragment is 0.3–2.5 K characters (a single panel; two panels roughly double that). That is about 2.3× shorter than `lz-string` and costs no bundle size. `CompressionStream` is supported from Chrome 103, Firefox 113 and Safari 16.4, and produces the same bytes as Node's `zlib.deflateRawSync`, so the CLI can print share links too. Reading a link is asynchronous.

Measurements are in the [research comment on #5](https://github.com/realJohnDoe/tracetrail/issues/5#issuecomment-6396330393).

## Considered Options

- **`lz-string`**: synchronous and works in old browsers, but 4.8 KB of bundle and links more than twice as long.
- **Encoding the trace only**: shorter, but the spec is the single description of an image (ADR-0003), and the JSON overhead disappears after compression.
