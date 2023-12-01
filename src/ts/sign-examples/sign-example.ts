import { ec as EC } from "elliptic";
import { TrustVault } from "../trust-vault";
import { PublicKeySignaturePairBuffer, SignCallback, SignDataBuffer } from "../types";

// TrustVault API key
const API_KEY = "Oaju5rJInvtTxZmKH0aV9pUHlfPWb2X57tNQ8DZ4";
// TrustVault Preprod testing URL
const TAPI_URL = "https://tapi-master.trustology-dev.com/graphql";

// walletId: 3ede7bae-282e-430b-bc8d-9b70cb609132
// device publicKey: 04c3234730509cf0f19ddcf249b89e45e47419eaca974690938e8c60f2aedb994f247243aa8d0326165b0229397eb15c0139eadef2cf5fd8d0120ae58ec6540445
// addr: 0x48b8B28dE6C4729665B4012C387d105B77bD617f
// apikey: wHxwfnyQK92kztJSovwIi7BSdJkRDYsm9r7xwiFS

// ADDRESS_TO_PUBLIC_KEY_MAPPING: {"0x48b8b28de6c4729665b4012c387d105b77bd617f": "04c3234730509cf0f19ddcf249b89e45e47419eaca974690938e8c60f2aedb994f247243aa8d0326165b0229397eb15c0139eadef2cf5fd8d0120ae58ec6540445"}
// ADDRESS_TO_WALLET_ID_MAPPING:  {"0x48b8b28de6c4729665b4012c387d105b77bd617f": "3ede7bae-282e-430b-bc8d-9b70cb609132"}
// APIKEY_TO_TRUST_ID_MAPPING:    {"wHxwfnyQK92kztJSovwIi7BSdJkRDYsm9r7xwiFS": "test-trust-id"}

// Construct sign callback to pass into TrustVault's sdk in order to generate user signatures.
// Here we generate a key on the fly. Any non-example implementation must use a secure key management store for this operation (see ./aws-kms.ts). 
const sign: SignCallback = async ({ shaSignData }: SignDataBuffer): Promise<PublicKeySignaturePairBuffer> => {
  const p256 = new EC("p256");
  const keyPair = p256.keyFromPrivate("f2bc6373aca624a3e8a3bad6a16232db54bb23bfb8362fe91f82b1d41c6e78d");
  const publicKey = keyPair.getPublic("hex");

  // using you private key pair, sign the digest.
  const { r, s } = keyPair.sign(shaSignData);
  // convert the r, s bytes signature to hex format
  const hexSignature = r.toString("hex", 64) + s.toString("hex", 64);

  const publicKeySignaturePair: PublicKeySignaturePairBuffer = {
    publicKey: Buffer.from(publicKey, "hex"),
    signature: Buffer.from(hexSignature, "hex"),
  };

  return publicKeySignaturePair;
};

(async () => {

  // const request = await (new TrustVault({apiKey: API_KEY, apiUrlOverride: TAPI_URL})).replacePublicKeyInDefaultSchedule("44bd33de-c044-410e-875d-e9faaebbb406", "045e190572e4078c9aeddb2e5cf9ef2b4494c134e7fb0094017406334e1bc4537a399a51bb1309914aa79d4a0c8536e62e7f7724602483c1cd4c4ddf88261f8423", sign);
  // console.info(`Request raised: ${JSON.stringify(request)}`);

  const request = await (new TrustVault({apiKey: API_KEY, apiUrlOverride: TAPI_URL})).sendRipple("r9RjanfwMhVH4HWZAYifD1vmMtxnX951zq", "0x1", "44bd33de-c044-410e-875d-e9faaebbb406/XRP/0", sign);
  console.info(`Request raised: ${JSON.stringify(request)}`);


})()