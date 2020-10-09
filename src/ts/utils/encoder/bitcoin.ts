// @ts-ignore
import * as bs58check from "bs58check";
import { SEC_P_256_K1_CURVE } from "../../static-data";
import { BitcoinNetwork, HexString } from "../../types";
import { createRipemd160Digest, createSha256Digest } from "../hash";
import { getCompressedPublicKey } from "../public-key";

type BitcoinNetworkPrefixes = "05" | "C4";

/**
 * Hex Values used for compatibility address generation
 */
const OP_0 = "00";
const RIPEMD_160_LENGTH_HEX = "14";

const networkPrefixes: { [key in BitcoinNetwork]: BitcoinNetworkPrefixes } = {
  bitcoin: "05",
  testnet: "C4",
};

/**
 * Creates a compatibility address (P2SH-P2WPKH) from the given public key
 * used to verify that the change address in the output belongs to the verified public key
 *
 * 1. create the locking script - (zero + RIPEMD-160 length + RIPEMD-160(SHA256(compressedPubKey)))
 * 2. create the hashed locking script - (RIPEMD-160(SHA256(lockingScript)))
 * 3. prefix the hashed locking script according to the network (mainnet/testnet) - (networkPrefix + hashedLockingScript)
 * 4. base58 encode the prefixed hashedLockingScript to get the compatibility address
 *
 * Compatibility addresses should should start with `3` for mainnet and `2` for testnet.
 *
 * @param publicKey - HD Wallet public key (compressed or non-compressed)
 * @param {BitcoinNetworks=} [btcNetwork="mainnet"] - the bitcoin network the address is for
 * @returns bitcoinCompatibilityAddress - the derived compatibility address from the public key
 *
 * @see https://bitcoincore.org/en/segwit_wallet_dev/
 */
export const getCompatibilityAddress = (publicKey: HexString, btcNetwork: BitcoinNetwork): string => {
  const compressedPublicKey: string = getCompressedPublicKey(publicKey, SEC_P_256_K1_CURVE);

  // SHA256 hash the compressedPublicKey
  const sha256Digest = createSha256Digest(compressedPublicKey);
  // RIPEMD-160 hash the SHA256 of the compressedPublicKey
  const ripemd160Digest = createRipemd160Digest(sha256Digest);
  // prefix the ripemd160Digest with `00` and `14` (`OP_0` and RIPEMD-160 bytes length in hex)
  // zero + ripemd160 length + ripemd160(sha256(compressedPubKey)) - this should be 22 bytes total
  const encodedLockingScript = `${OP_0}${RIPEMD_160_LENGTH_HEX}${ripemd160Digest}`;

  // SHA256 hash the encodedLockingScript
  const scriptSha256Digest = createSha256Digest(encodedLockingScript);
  // RIPEMD-160 hash the SHA256 hash of the encodedLockingScript -> ripemd160(sha256(encodedLockingScript)))
  const encodedLockingScriptDigest = createRipemd160Digest(scriptSha256Digest);

  // add the network prefix to the encodedLockingScriptDigest and convert it to bytes for base58 encoding
  const networkPrefix: BitcoinNetworkPrefixes = networkPrefixes[btcNetwork];
  const prefixedEncodedLockingScriptDigest = Buffer.from(`${networkPrefix}${encodedLockingScriptDigest}`, "hex");

  // base58 encode the prefixedEncodedLockingScriptDigest to get the compatibility address -> base58(prefix + encodedLockingScriptDigest)
  const btcScriptAddress = bs58check.encode(prefixedEncodedLockingScriptDigest);
  return btcScriptAddress;
};
