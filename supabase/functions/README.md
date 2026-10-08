# Edge functions

## `myob-push`

The only thing in the project holding the MYOB client secret, refresh token and
company-file login. The browser never sees them: it sends a push request that
`src/lib/myob.ts` has already worded and costed, and this function does the
OAuth refresh and the writes to `api.myob.com`.

Deploy with `supabase functions deploy myob-push` (or the Supabase MCP). It runs
with `verify_jwt` on and uses `SUPABASE_SERVICE_ROLE_KEY`, which the platform
injects — nothing extra to configure.

Actions, all `POST` with a JSON body carrying `action`:

| action | what it does |
| --- | --- |
| `save_credentials` | stores the API key/secret, redirect URI and the base64 company-file login |
| `credential_state` | reports which of those are set — never their values |
| `authorize` | exchanges an authorisation code for the refresh token |
| `company_files` | lists the company files the key can see |
| `lookup` | accounts, jobs or tax codes from the chosen file |
| `test` | checks the configured account, job and tax code all resolve |
| `push` | raises the sale (or appends a line to an open order) and writes the result back onto `orders` |

Credentials live in `myob_credentials`, which has RLS on and no policies at all,
so only the service role can read it.
