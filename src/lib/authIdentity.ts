import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { WasClient, type JsonObject } from '@interop/was-client'
import {
  deriveUnlockIdentity,
  KEYRING_KDF,
  mintRecordEncryption,
  parseRecordFrame,
  recordCipher,
  recordSealCipher,
  signRecordFrame,
  verifyRecordProof,
  type SignedRecord,
} from '@interop/wallet-core/keyring'
import {
  WAS_SERVER_URL,
  BOOTSTRAP_COLLECTION,
  BOOTSTRAP_RESOURCE,
  RECORD_VERSION,
  RECORD_LABEL,
} from '../app.config'

/**
 * Phase 2: a durable author identity, recoverable from a passphrase alone,
 * on any browser -- see ARCHITECTURE.md. Uses the real
 * `deriveUnlockIdentity` / `KEYRING_KDF` derivation Freewallet's own keyring
 * uses (600,000-iteration PBKDF2), and the same EDV-style signed-record
 * sealing -- but points it at a resource the unlock identity provisions and
 * owns *itself*, rather than a resource Freewallet's account-genesis ceremony
 * would set up. That resource holds the author's actual secret key,
 * encrypted -- a deliberate divergence from Freewallet, which never stores
 * key material there; see ARCHITECTURE.md for why that's fine here and
 * wouldn't be for Freewallet's multi-device case.
 */

export interface AuthorSession {
  authorDid: string
  client: WasClient
  spaceId: string
}

interface BootstrapPlaintext {
  authorDid: string
  publicKeyMultibase: string
  secretKeyMultibase: string
  spaceId: string
}

/**
 * Derives the unlock identity for a passphrase and wraps it in a `WasClient`
 * bound to its own deterministic bootstrap Space -- `unlockSpaceIdFor`, a
 * plain hash of the unlock DID, so it's always the same address for the
 * same passphrase, with nothing to remember or store.
 */
async function unlockClientFor(passphrase: string) {
  const identity = await deriveUnlockIdentity({ secret: passphrase, kdf: KEYRING_KDF })
  const client = new WasClient({ serverUrl: WAS_SERVER_URL, zcapClient: identity.zcapClient })
  return { identity, client }
}

/**
 * Creates a new author account for this passphrase.
 *
 * What happens, in order:
 * 1. A small private Space gets created just for this passphrase -- a
 *    locked box, basically. Nothing about the author exists yet, so this
 *    step doesn't need an author key at all.
 * 2. A real author identity (a fresh key pair) gets generated, with its own
 *    Space -- this is where the actual blog posts will live.
 * 3. The author's secret key gets encrypted and saved inside that locked
 *    box from step 1, so it can be pulled back out later with the same
 *    passphrase.
 *
 * Refuses to run if this passphrase was already registered before --
 * otherwise it would silently overwrite the first account's saved key.
 */
export async function registerAuthor({
  passphrase,
}: {
  passphrase: string
}): Promise<AuthorSession> {
  const { identity, client: unlockClient } = await unlockClientFor(passphrase)

  const existing = await unlockClient.space(identity.spaceId).describe()
  if (existing) {
    throw new Error('This passphrase is already registered.')
  }

  await unlockClient.createSpace({ id: identity.spaceId, controller: identity.agent.id })
  await unlockClient.space(identity.spaceId).createCollection({ id: BOOTSTRAP_COLLECTION })

  const authorKeyPair = await Ed25519VerificationKey.generate()
  const authorDid = `did:key:${authorKeyPair.fingerprint()}`
  authorKeyPair.id = `${authorDid}#${authorKeyPair.fingerprint()}`
  const authorClient = WasClient.fromSigner({
    serverUrl: WAS_SERVER_URL,
    signer: authorKeyPair.signer(),
  })
  const authorSpace = await authorClient.createSpace()

  const { publicKeyMultibase, secretKeyMultibase } = await authorKeyPair.export({
    secretKey: true,
    canonicalize: true,
  })

  // Who is allowed to open the box: a one-time key made just for this
  // record, itself wrapped to the unlock identity's key-agreement key.
  const encryptionDescriptor = await mintRecordEncryption({
    keyAgreementKey: identity.keyAgreementKey,
  })
  const cipher = await recordSealCipher({
    encryption: encryptionDescriptor,
    collectionId: BOOTSTRAP_COLLECTION,
  })
  const { envelope } = await cipher.encrypt({
    data: {
      authorDid,
      publicKeyMultibase,
      secretKeyMultibase,
      spaceId: authorSpace.id,
    } satisfies BootstrapPlaintext,
  })
  const record = await signRecordFrame({
    version: RECORD_VERSION,
    encryption: encryptionDescriptor,
    wrapped: envelope,
    signer: identity.recordSigner,
  })
  console.log("🚀 ~ registerAuthor ~ record:", record)

  await unlockClient
    .space(identity.spaceId)
    .collection(BOOTSTRAP_COLLECTION)
    .resource(BOOTSTRAP_RESOURCE)
    .put(record as unknown as JsonObject)

  return { authorDid, client: authorClient, spaceId: authorSpace.id }
}

/**
 * Recovers the author identity from a passphrase, on any browser: re-derive
 * the same unlock identity, read its own bootstrap resource back (self-
 * authorized -- the read never touches the author key), decrypt it, and
 * reconstruct the real author signer. Returns `null` if no account is
 * registered under this passphrase.
 */
export async function loginAuthor({
  passphrase,
}: {
  passphrase: string
}): Promise<AuthorSession | null> {
  const { identity, client: unlockClient } = await unlockClientFor(passphrase)

  const record = (await unlockClient
    .space(identity.spaceId)
    .collection(BOOTSTRAP_COLLECTION)
    .resource(BOOTSTRAP_RESOURCE)
    .get()) as unknown as SignedRecord | null
  if (!record) {
    return null
  }

  const { encryption: encryptionDescriptor, wrapped } = parseRecordFrame({
    record,
    label: RECORD_LABEL,
    version: RECORD_VERSION,
  })
  await verifyRecordProof({
    record,
    allowedKeyMultibases: identity.recordSigner.keyMultibase,
    label: RECORD_LABEL,
  })

  const cipher = await recordCipher({
    keyAgreementKey: identity.keyAgreementKey,
    keyResolver: identity.keyResolver,
    encryption: encryptionDescriptor,
    collectionId: BOOTSTRAP_COLLECTION,
  })
  const plaintext = (await cipher.decrypt({
    envelope: wrapped as never,
  })) as unknown as BootstrapPlaintext

  const authorKeyPair = Ed25519VerificationKey.fromMultikey({
    publicKeyMultibase: plaintext.publicKeyMultibase,
    secretKeyMultibase: plaintext.secretKeyMultibase,
  })
  authorKeyPair.id = `${plaintext.authorDid}#${authorKeyPair.fingerprint()}`
  const authorClient = WasClient.fromSigner({
    serverUrl: WAS_SERVER_URL,
    signer: authorKeyPair.signer(),
  })

  return { authorDid: plaintext.authorDid, client: authorClient, spaceId: plaintext.spaceId }
}
