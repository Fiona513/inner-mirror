interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

// The MVP does not enable D1, but the Sites worker template keeps the optional
// binding in its environment contract for deployment compatibility.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1Database = any;

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
