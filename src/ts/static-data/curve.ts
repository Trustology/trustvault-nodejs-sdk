import { Curve } from "../types";

/**
 * The curve which to get the client's own publicKey from
 */
export const NIST_P_256_CURVE: Curve = "p256";

/**
 * Bitcoin/Ethereum Curve
 * @see: https://en.bitcoin.it/wiki/Secp256k1
 */
export const SEC_P_256_K1_CURVE: Curve = "secp256k1";
