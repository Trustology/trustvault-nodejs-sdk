import * as crypto from "crypto";
import { ec as EC } from "elliptic";
import { ProvenanceDataSchema } from "../types";
import { derEncodeProvenance, encodeSignature } from "./encoder";

const ec = new EC("p256");

// Provenance from PB Table
const provenanceSig =
  "902710a8d4b8ebf0eb39f1e984dee889c5587e396d406f4a4085a3f099c0bc8deb08fa56b8c4e7a8dc4713a575b58233a203e1f4fa0fa5b1edd98d770fce4fe6";
// Extract R & S
const sigR = Buffer.from(provenanceSig.substring(0, provenanceSig.length / 2), "hex");
const sigS = Buffer.from(provenanceSig.substring(provenanceSig.length / 2, provenanceSig.length), "hex");

// DER Encode
const derSig = encodeSignature({ r: sigR, s: sigS });

// HSM Provenance PublicKey
const provenancePublicKey =
  "041cbce9985c7627f67b60b65cd1921fc79cbbc5b38a8c5702579d9573dd3b90f4e8c189679f1911335fd753510706d66c9c76147b961b085e25e3742e02524b01";

// Get EC Crypto
const prodprovenancekey = ec.keyFromPublic(provenancePublicKey, "hex");

const dataToSign: ProvenanceDataSchema = {
  publicKey:
    "04057a3c15ed51cc0acdd22686df00232d4f4949d6f4ee93c6986d539b9ad256e5b5a11c3d547b6aff5c91c49effd33d8a64ecffa0ba37b0087d1cfe5e063b97cc",
  path: [0x80000049, 0x80000000, 0x80000000, 0x0, 0x871],
  walletId: "5d169161-4e9e-40d2-ad57-17988eb391c5/BTC/0",
};

const derEncodedData = derEncodeProvenance(dataToSign);

const prodhash = crypto.createHash("sha256").update(derEncodedData).digest("hex");

const newx = prodprovenancekey.verify(prodhash, derSig);
console.info(newx);
