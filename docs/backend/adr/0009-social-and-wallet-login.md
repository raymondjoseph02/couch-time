# ADR 0009: Google sign-in via Firebase ID-token exchange; wallet sign-in via signed nonces (SIWE)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-04 |
| Phase | Week 4 |
| Related | [ADR 0008](./0008-authentication-jwt-cookies.md), `src/app/components/auth/SocialLoginButtons.tsx`, `src/lib/firebase.ts` |

## Context

The sign-in screen already shows **Google, MetaMask, Starknet and Phantom** buttons, and the frontend has Firebase configured (`src/lib/firebase.ts`) with Google sign-in code commented out. `UserProps` has `authType: "firebase" | "web 3"`. None of it reaches a backend.

We want every method to end in **the same session** from [ADR 0008](./0008-authentication-jwt-cookies.md), with one user able to link several methods (AUTH-10).

## Decision

**All methods follow one pattern:** *prove identity → find or create the user via `auth_identities (provider, provider_user_id)` → issue our own cookies.*

**Google (via Firebase)**
1. The frontend runs `signInWithPopup(auth, GoogleAuthProvider)` and gets a Firebase **ID token**.
2. It sends `POST /auth/google { idToken }`.
3. The backend verifies the token with **`firebase-admin` `verifyIdToken`** (signature, audience = our project, expiry, issuer).
4. It uses `uid` as `provider_user_id` and the email (if verified) to suggest linking to an existing password account. **Never auto-link on email alone unless the email is verified.**
5. It issues our session. Firebase's token is not used after this.

**Ethereum (MetaMask): Sign-In with Ethereum (EIP-4361)**
1. `GET /auth/wallet/nonce?address=0x…&chain=ethereum` → the server creates a random nonce (stored with a 5-minute TTL in `wallet_nonces` or Redis) and returns a SIWE message (domain, address, statement, URI, chain id, nonce, issued-at).
2. The wallet signs the message (`personal_sign`).
3. `POST /auth/wallet/verify { address, chain, message, signature }` → the server checks that the message's domain, nonce and expiry match what it issued, **recovers the signer** with `viem`'s `verifyMessage`, compares it to the address, and **marks the nonce used** (single use).
4. `provider_user_id` = the lower-cased address.

**Solana (Phantom), P2:** the same nonce flow; the signature is ed25519, verified with `tweetnacl` against the base58 public key.

**Starknet, P2:** the same nonce flow; account signatures are verified by calling the account contract's `is_valid_signature` (starknet.js). This is harder, which is why it's a stretch goal.

## Alternatives considered

| Option | Pros | Cons | Why not chosen |
|---|---|---|---|
| Direct Google OIDC (no Firebase) | One less vendor; you learn the full OAuth code flow. | More code (redirects, PKCE, state). | Firebase is already set up. Revisit as an open question (PRD §13), since it's a great learning upgrade. |
| Use Firebase sessions for everything | Less code. | Wallets don't fit; two session systems. | One session model is simpler to reason about. |
| Third-party wallet auth (e.g. a hosted Web3 auth service) | Fast. | Hides the signature concepts; vendor lock-in. | Learning goal. |
| Trust the address the client sends | Trivial. | Anyone can claim any address. | Insecure; the signature is the proof. |

## Consequences

**Good:** every button works and produces the same session; accounts can be linked; replay attacks on wallet sign-in are blocked by single-use nonces.

**Bad / costs:** three verification libraries; wallet-only users have no email, so email features must handle `null`; a Firebase service-account secret has to be managed.

## What you'll learn

- The "token exchange" pattern (an external identity becomes your own session).
- OIDC ID tokens: what `aud`, `iss`, `exp` and `sub` mean and why each must be checked.
- Public-key cryptography in practice: signing vs verifying, recovering an address from a signature.
- Nonces and replay protection.

## Done when

- [ ] Google sign-in creates one user; a second sign-in reuses it.
- [ ] Re-sending the same wallet signature fails (nonce already used).
- [ ] A signature from address A submitted as address B fails.
- [ ] A user signed in with a password can link MetaMask from the account page, then sign in with either.

## References

- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- EIP-4361 (SIWE): https://eips.ethereum.org/EIPS/eip-4361
- https://viem.sh/docs/actions/public/verifyMessage
- https://docs.phantom.app/solana/signing-a-message
