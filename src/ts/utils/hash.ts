import { createHash } from "crypto";
import { RIPE_MD_160_HASH_ALGO, SHA_256_HASH_ALGO } from "../static-data";

/**
 * Creates a digest from the given hex string using SHA256 hashing function
 *
 * @param {string} hexString - the hex string that will be hashed
 * @returns {string} digest - the digest hex string
 * @see https://en.wikipedia.org/wiki/SHA-2
 */
export const createSha256Digest = (hexString: string): string => {
  const buffer = Buffer.from(hexString, "hex");
  return createHash(SHA_256_HASH_ALGO).update(buffer).digest("hex");
};

/**
 * Creates a digest from the given hex string using RIPEMD-160 hashing function
 *
 * @param {string} hexString - the hex string that will be hashed
 * @returns {string} digest - the digest hex string
 * @see https://en.wikipedia.org/wiki/RIPEMD
 */
export const createRipemd160Digest = (hexString: string): string => {
  const buffer = Buffer.from(hexString, "hex");
  return createHash(RIPE_MD_160_HASH_ALGO).update(buffer).digest("hex");
};
