import { HexString } from "./data";

export type SignCallback = (signData: SignDataBuffer) => Promise<PublicKeySignaturePairBuffer>;

export interface SignData {
  // The DER encoded transaction digest and the wallet path
  signData: HexString;
  // The SHA256 digest of the signData
  shaSignData: HexString;
}

export interface SignDataBuffer {
  // The DER encoded transaction digest and the wallet path
  signData: Buffer;
  // The SHA256 digest of the signData
  shaSignData: Buffer;
}

export interface TransactionDigestData extends SignData {
  // The transaction digest
  transactionDigest: string;
}

// TODO: docs
export interface PublicKeySignaturePair {
  publicKey: HexString; // 130 hex string (`04` hex prefixed)
  signature: HexString; // 128 hex string - 64 bytes
}

export interface PublicKeySignaturePairBuffer {
  publicKey: Buffer; // 65 bytes - (`04` hex prefixed)
  signature: Buffer; // 64 bytes - (r + s ~ 32 bytes + 32 bytes)
}

export interface SignRequest {
  publicKeySignaturePairs: PublicKeySignaturePair[];
}

export interface AddSignaturePayload {
  requestId: string;
  signRequests: SignRequest[];
}

export interface ProvenanceDataSchema {
  // The HD walletId of the sub-wallet
  walletId: string;
  // The HD wallet path of the sub-wallet in integer
  path: number[];
  // The sub-wallet's public key
  publicKey: string;
}

export interface SubjectPublicKeyInfo {
  algorithmIdentifier: {
    algorithm: string;
    parameters: string;
  };
  subjectPublicKey: Buffer;
}

export interface SignatureRS {
  r: Buffer;
  s: Buffer;
}
