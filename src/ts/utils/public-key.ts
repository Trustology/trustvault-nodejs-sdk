import { ec as EC } from "elliptic";
import { Curve } from "../types";

/**
 * Retrieves the compressedPublicKey of the given publicKey
 * @param publicKey
 * @param curve
 */
export const getCompressedPublicKey = (publicKey: string, curve: Curve): string => {
  // Convert publicKey to a compressed public key
  const key = new EC(curve).keyFromPublic(Buffer.from(publicKey, "hex"), "hex");
  const compressed = true;
  return key.getPublic(compressed, "hex");
};
