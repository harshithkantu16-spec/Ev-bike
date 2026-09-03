---
name: OpenAPI upload schemas
description: Compatibility notes for adding upload endpoints to the workspace API contract.
---

When adding OpenAPI upload endpoints, use component schema names that do not match the operation-generated request/response names. In this workspace, the Zod generator targets Zod 3, so OpenAPI `integer` and URI formats can produce unsupported `zod.int()` and `zod.url()` calls.

**Why:** Code generation creates both operation validators and exported component types; colliding names cause duplicate exports, while newer Zod helpers fail the workspace type check.

**How to apply:** Prefer a distinct component name such as upload metadata, use a numeric schema when integer-specific validation is not essential, and keep URL validation as a plain string unless the current generator supports the format.