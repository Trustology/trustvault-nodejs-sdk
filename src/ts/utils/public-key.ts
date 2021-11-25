import { ec as EC } from "elliptic";
import { bufferToHex, pubToAddress as pubKeyToAddress, toChecksumAddress } from "ethereumjs-util";
import { Curve, HexString } from "../types";

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

/**
 * Converts a prefixed public key to a checksum address
 * @param publicKey {String}
 * @return address {String} - hex
 */
export function pubToChecksumAddress(publicKey: HexString, addressPrefix?: string): HexString | undefined {
  let address: string;
  const noPrefixPublicKey = publicKey.slice(2);

  try {
    address = pubKeyHexToAddressHex(noPrefixPublicKey);
  } catch (e) {
    console.error(
      `Failed to create address. Expected prefixed publicKey length to be 130, got ${publicKey.length}). PublicKey: ${publicKey}`,
      e,
    );
    return undefined;
  }

  const checkSumAdress = toChecksumAddress(address);
  return addressPrefix ? addressPrefix + checkSumAdress.substring(2) : checkSumAdress;
}

/**
 * Converts a hex string to a buffer.
 * @param hex
 */
const hexToBuffer = (hex: string): Buffer => Buffer.from(hex, "hex");

/**
 * Converts publicKey to ethereum hex address
 * @param publicKey {String} - publicKey should not have a prefix
 * @return address {String}
 */
const pubKeyHexToAddressHex = (publicKey: string): string => {
  // pubkey hex to buffer -> pubkey buffer to address buffer -> address buffer to address hex
  const buffer = hexToBuffer(publicKey);
  const addressBuffer = pubKeyToAddress(buffer);
  const addressHex = bufferToHex(addressBuffer);
  return addressHex;
};
