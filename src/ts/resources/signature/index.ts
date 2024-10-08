import { createHash, createHmac } from "crypto";
import { ec as EC } from "elliptic";
import {
  NIST_P_256_CURVE,
  PUBLIC_KEY_HEX_PREFIX,
  SHA_256_HASH_ALGO,
  VALID_PUBLIC_KEY_BYTE_LENGTH,
  VALID_SIGNATURE_BYTE_LENGTH,
} from "../../static-data";
import {
  Curve,
  DigestSignData,
  HdWalletPath,
  PolicySchedule,
  ProvenanceDataSchema,
  PublicKeyProvenance,
  PublicKeySignaturePairBuffer,
  SignCallback,
  SignData,
  SignDataBuffer,
  SignRequest,
  TransactionDigestData,
} from "../../types";
import {
  derEncodeProvenance,
  derEncodeRecovererSchedules,
  derEncodeTxDigestPath,
  derEncodeTxDigestPathAlgo,
  isSignMessageDigestData,
  isTransactionDigestData,
} from "../../utils";

/**
 * Generic function to verify the digest, signature and publicKey matches for the given curve
 * @param digest
 * @param signature - 64 bytes
 * @param publicKeys - An array of 65 bytes (first byte should be 04 in hex string)
 * @param curve - p256 | secp256k1
 * @returns {Boolean}
 */
export const verifySignature = (digest: Buffer, signature: Buffer, publicKeys: Buffer[], curve: string): boolean => {
  return publicKeys.some((publicKey) => {
    const key = new EC(curve).keyFromPublic(publicKey);
    const r = signature.subarray(0, 32).toString("hex");
    const s = signature.subarray(-32).toString("hex");
    return key.verify(digest, { r, s });
  });
};

/**
 * Verifies if the recovererSchedules did indeed came from trustVault
 * @param {PolicySchedule[]} recovererSchedules
 * @param {String} recovererSchedulesSignature - 128 characters hex format
 * @param {Buffer[]} trustVaultRecoverersPublicKeys - array of 65 bytes trustVault publicKey
 * @throws when the recovererSchedule and signature does not match
 */
export const verifyRecovererSchedules = (
  recovererSchedules: PolicySchedule[],
  recovererSchedulesSignature: string,
  trustVaultRecoverersPublicKeys: Buffer[],
): boolean => {
  const derRecoverers: Buffer = derEncodeRecovererSchedules(recovererSchedules);
  const recovererSchedulesDigest: Buffer = createHash("sha256").update(derRecoverers).digest();

  const isVerified: boolean = verifySignature(
    recovererSchedulesDigest,
    Buffer.from(recovererSchedulesSignature, "hex"),
    trustVaultRecoverersPublicKeys,
    NIST_P_256_CURVE,
  );

  if (!isVerified) {
    throw new Error(`Recoverer Schedules signature does not match.`);
  }

  return true;
};

/**
 * Utility function to convert a HdWalletPath array hex values to integer
 * @param path
 */
const pathHexToInt = (path: HdWalletPath) => path.map((hex) => parseInt(hex, 16));

/**
 * Verifies if the publicKey did indeed came from trustVault
 * @param walletId
 * @param publicKeyProvenance
 * @throw - if the publicKey accountHSMProvenanceSignature does not match the computed provenanceDataHash
 */
export const verifyPublicKey = (
  walletId: string,
  publicKeyProvenance: PublicKeyProvenance,
  trustVaultPublicKeys: Buffer[],
): void => {
  const provenanceData: ProvenanceDataSchema = {
    walletId,
    path: pathHexToInt(publicKeyProvenance.path),
    publicKey: publicKeyProvenance.publicKey,
  };
  const derEncodedProvenanceData: Buffer = derEncodeProvenance(provenanceData);
  const provenanceDataHash: Buffer = createHash("sha256").update(derEncodedProvenanceData).digest();
  const trustVaultProvenanceSignature =
    publicKeyProvenance.trustVaultProvenanceSignature || publicKeyProvenance.accountHSMProvenanceSignature;

  if (!trustVaultProvenanceSignature) {
    throw new Error(`Missing trustVaultProvenanceSignature: ${JSON.stringify(publicKeyProvenance)}`);
  }

  const isVerified: boolean = verifySignature(
    provenanceDataHash,
    Buffer.from(trustVaultProvenanceSignature, "hex"),
    trustVaultPublicKeys,
    NIST_P_256_CURVE,
  );

  if (!isVerified) {
    throw new Error(`Public key signature does not match`);
  }
};

/**
 * Verifies the request body HMAC signature
 * @param requestBody - the stringified body of the webhook request
 * @param secret - the secret that TrustVault gave upon registering your webhook
 * @param signatureHeader - the signature of the request body `X-Sha2-Signature`
 * @throw - throws an error if the signature is incorrect
 */
export const verifyHmac = (requestBody: string, secret: string, signatureHeader: string): boolean => {
  const hmac = createHmac(SHA_256_HASH_ALGO, secret);

  // Compute the hash from the stringified JSON request.body
  const computedHashSignature = hmac.update(requestBody).digest("hex");

  // Throw an error if the computed signature is different from the signature in the headers
  if (computedHashSignature !== signatureHeader) {
    throw new Error("Webhook hash signature mismatch");
  }

  return true;
};

/**
 * Verifies the publicKeySignaturePair generated by the signCallBack is correct
 * @param publicKeySignaturePair
 * @throws - throws an error if the publicKeySignaturePair i
 */
export const verifyPublicKeySignaturePair = (
  signedHexData: Buffer,
  publicKeySignaturePair: PublicKeySignaturePairBuffer,
  curve: Curve,
): boolean => {
  if (!publicKeySignaturePair || typeof publicKeySignaturePair !== "object") {
    throw new Error("publicKeySignaturePair produced by sign callback is invalid");
  }
  const { publicKey, signature } = publicKeySignaturePair;
  if (!publicKey) {
    throw new Error("publicKeySignaturePair.publicKey is missing");
  }
  if (!signature) {
    throw new Error("publicKeySignaturePair.signature is missing");
  }
  if (publicKey.toString("hex", 0, 1) !== PUBLIC_KEY_HEX_PREFIX) {
    throw new Error("publicKeySignaturePair.publicKey must be prefixed is `04` hex string");
  }
  if (publicKey.length !== VALID_PUBLIC_KEY_BYTE_LENGTH) {
    throw new Error(`publicKey hex must be ${VALID_PUBLIC_KEY_BYTE_LENGTH} in byte length (04 hex prefix + 64 bytes)`);
  }
  if (signature.length !== VALID_SIGNATURE_BYTE_LENGTH) {
    throw new Error(`publicKeySignaturePair.signature must be ${VALID_SIGNATURE_BYTE_LENGTH} in byte length`);
  }

  // verify the publicKey, signature and the data matches
  const isVerified = verifySignature(signedHexData, signature, [publicKey], curve);

  if (!isVerified) {
    throw new Error("The signData and the publicKeySignaturePair produced by the sign callback does not match");
  }

  return isVerified;
};

/**
 * Utility function get the correct signData/shaSignData by DER encoding the transactionDigest and path
 * @param encoding
 */
export const getTransactionSignDataDigest = (
  transactionDigest: Buffer,
  path: HdWalletPath,
  algo?: string,
): SignDataBuffer => {
  let signData: Buffer;

  const pathInt = path.map((hexIndex) => parseInt(hexIndex, 16));

  if (algo) {
    signData = derEncodeTxDigestPathAlgo({
      digest: transactionDigest.toString("hex"),
      path: pathInt,
      algo,
    });
  } else {
    signData = derEncodeTxDigestPath({
      digest: transactionDigest.toString("hex"),
      path: pathInt,
    });
  }

  const shaSignData: Buffer = createHash("sha256").update(signData).digest();

  return {
    signData,
    shaSignData,
  };
};

/**
 * Creates a signRequest by invoking the sign callback with the hex digest that needs to be signed
 * @returns {SignRequest}
 */
export const createSignRequest = async (
  requestId: string,
  digest: Buffer,
  unverifiedDigestData: TransactionDigestData | SignData | DigestSignData,
  { signData, shaSignData }: SignDataBuffer, // own generated signData
  sign: SignCallback,
): Promise<SignRequest> => {
  const digestHex = digest.toString("hex");
  const signDataHex = signData.toString("hex");
  const shaSignDataHex = shaSignData.toString("hex");
  let areSignDigestsCorrect =
    signDataHex === unverifiedDigestData.signData && shaSignDataHex === unverifiedDigestData.shaSignData;

  if (isTransactionDigestData(unverifiedDigestData)) {
    areSignDigestsCorrect = areSignDigestsCorrect && digestHex === unverifiedDigestData.transactionDigest;
  }

  if (isSignMessageDigestData(unverifiedDigestData)) {
    areSignDigestsCorrect = areSignDigestsCorrect && digestHex === unverifiedDigestData.digest;
  }

  if (!areSignDigestsCorrect) {
    const digestData = JSON.stringify({
      digest: digestHex,
      signData: signDataHex,
      shaSignData: shaSignDataHex,
      unverifiedDigestData,
    });
    throw new Error(
      `The digest data produced does not match with the expected unverified digest from server: ${digestData}`,
    );
  }

  const publicKeySignaturePair: PublicKeySignaturePairBuffer = await sign({ signData, shaSignData }, { requestId });

  // verify the public key signature pair that the sign callback returned is correct
  verifyPublicKeySignaturePair(shaSignData, publicKeySignaturePair, NIST_P_256_CURVE);

  const signRequest: SignRequest = {
    publicKeySignaturePairs: [
      {
        publicKey: publicKeySignaturePair.publicKey.toString("hex"),
        signature: publicKeySignaturePair.signature.toString("hex"),
      },
    ],
  };

  return signRequest;
};
