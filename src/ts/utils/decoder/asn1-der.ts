import { SignatureRS, SubjectPublicKeyInfo } from "../../types/signature";
import { decodePublicKey, decodeSignature } from "../../utils/asn1/asn1-der";

/**
 * Decodes a DER encoded signature to extract the r and s values
 * @param {Buffer} signature
 */
export const derDecodeSignature = (signature: Buffer): SignatureRS => {
  return decodeSignature(signature);
};

/**
 * decodes a DER encoded SubjectPublicKeyInfo
 * @param {Buffer} publicKeyInfo
 */
export const derDecodePublicKey = (publicKeyInfo: Buffer): SubjectPublicKeyInfo => {
  return decodePublicKey(publicKeyInfo);
};
