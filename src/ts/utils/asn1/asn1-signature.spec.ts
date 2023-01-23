import * as chai from "chai";
import dirtyChai from "dirty-chai";
import { decodePublicKey, decodeSignature, encodeProvenance } from "./asn1-der";
import {
  TEST_PROVENANCE,
  TEST_PROVENANCE_DER,
  TEST_PROVENANCE_IN_HEX,
  TEST_PUBLICKEY_DER,
  TEST_SIGNATURE,
  TEST_SIGNATURE_DER,
  TEST_SUBJECT_PUBLICKEY_INFO,
} from "./asn1-test-data.spec";

chai.use(dirtyChai);
const expect = chai.expect;

describe("🔥🔥🔥 ASN1 DER PublicKey decoder tests🔥🔥🔥", () => {
  it("decode Full SubjectPublicKeyInfo schema", () => {
    const x = decodePublicKey(TEST_PUBLICKEY_DER);
    expect(x).to.deep.equals(TEST_SUBJECT_PUBLICKEY_INFO);
  });

  it("decode Signature schema", () => {
    const x = decodeSignature(TEST_SIGNATURE_DER);
    expect(x).to.deep.equals(TEST_SIGNATURE);
  });
});

describe("🔥🔥🔥 ASN1 DER TrustVaultPublicKeyProvenance encoder tests🔥🔥🔥", () => {
  it("encode TrustVaultPublicKeyProvenance with path in number", () => {
    const x = encodeProvenance(TEST_PROVENANCE);
    expect(x.toString("hex").toUpperCase()).to.equal(TEST_PROVENANCE_DER);
  });
  it("encode TrustVaultPublicKeyProvenancewith path in hex", () => {
    const x = encodeProvenance(TEST_PROVENANCE_IN_HEX);
    expect(x.toString("hex").toUpperCase()).to.equal(TEST_PROVENANCE_DER);
  });
});
