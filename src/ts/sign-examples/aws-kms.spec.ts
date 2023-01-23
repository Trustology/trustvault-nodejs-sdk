import { fail } from "assert";
import * as AWSMock from "aws-sdk-mock";
import * as chai from "chai";
import dirtyChai from "dirty-chai";
import { SignDataBuffer } from "../types/signature";
import { TEST_SIGNATURE, TEST_SIGNATURE_DER, TEST_SUBJECT_PUBLICKEY_INFO } from "../utils/asn1/asn1-test-data.spec";
import { AwsKmsKeyStore } from "./aws-kms";
import { mockKMSDescribe, mockKMSPublicKey, mockKMSSign } from "./test-data";

chai.use(dirtyChai);
const expect = chai.expect;

describe("AWS KMS Tests", () => {
  afterEach(() => {
    // restore KMS so it doesn't impact other tests
    AWSMock.restore("KMS");
  });
  describe("KMS Validation Tests", () => {
    it("It should pass validation if KMS key is correct", async () => {
      // mock the KSM responses
      mockKMSDescribe();
      mockKMSPublicKey();

      try {
        const keyStore = new AwsKmsKeyStore("dummyKey");
        const pubKey = await keyStore.getPublicKey();
        expect(pubKey.toString("hex")).to.equal(TEST_SUBJECT_PUBLICKEY_INFO.subjectPublicKey.toString("hex"));
      } catch (e) {
        fail(`Validation did not pass ${JSON.stringify(e)}`);
      }
    });
    it("It should fail if KMS key is not enabled", async () => {
      // mock the KSM responses
      mockKMSDescribe(false);
      mockKMSPublicKey();

      try {
        const keyStore = new AwsKmsKeyStore("dummyKey");
        await keyStore.getPublicKey();
        fail("KMS Key enabled = false did not throw an error");
      } catch (e) {
        expect((e as Error).message).to.be.equal("Key dummyKey is not enabled");
      }
    });
    it("It should fail if KMS key is not correct usage type", async () => {
      // mock the KSM responses
      mockKMSDescribe(true, "ENCRYPT_DECRYPT");
      mockKMSPublicKey();

      try {
        const keyStore = new AwsKmsKeyStore("dummyKey");
        await keyStore.getPublicKey();
        fail("KMS Key should have failed, but did not ");
      } catch (e) {
        expect((e as Error).message).to.be.equal("Key dummyKey does not have the correct usage type.");
      }
    });
  });
  describe("KMS Sign Tests", () => {
    it("It should pass if signaure is correct", async () => {
      // mock the KSM responses
      mockKMSDescribe();
      mockKMSPublicKey();
      mockKMSSign("ECDSA_SHA_256", TEST_SIGNATURE_DER);

      try {
        const keyStore = new AwsKmsKeyStore("dummyKey");
        // AWS KMS DUMMY parameters
        const params: SignDataBuffer = {
          signData: TEST_SIGNATURE_DER,
          // The SHA256 digest of the signData
          shaSignData: TEST_SIGNATURE_DER, // This is not used for this test but in reality will be SHA256(TEST_SIGNATURE_DER)
        };
        const signedDataResponse = await keyStore.sign(params);

        expect(signedDataResponse.publicKey.toString("hex")).to.equal(
          TEST_SUBJECT_PUBLICKEY_INFO.subjectPublicKey.toString("hex"),
        );
        expect(signedDataResponse.signature.slice(0, 32)).to.deep.equal(TEST_SIGNATURE.r);
        expect(signedDataResponse.signature.slice(32)).to.deep.equal(TEST_SIGNATURE.s);
      } catch (e) {
        fail(`Validation did not pass ${JSON.stringify(e)}`);
      }
    });
  });
  describe("KMS Public Key Tests", () => {
    it("It should fail if the publicKey algo is wrong", async () => {
      // mock the KSM responses
      mockKMSDescribe();
      // publicKey DER encoded with wrong algo ver to force a failure
      mockKMSPublicKey(
        Buffer.from(
          "3059301306072a8648ce3d020106082a8648ce3d0301080342000461178348277d03cbca752806e5ec66d61b07952accfb79cf48931240278aea481459b10d01874e0b026628fd5f95ce7440e931d1630d322cfeba28712ffaa8be",
          "hex",
        ),
      );

      try {
        const keyStore = new AwsKmsKeyStore("dummyKey");
        await keyStore.getPublicKey();
      } catch (e) {
        expect((e as Error).message).to.be.equal(
          "Key dummyKey has an unknown validation error: PublicKeyNotFound: PublicKey could not be decoded or incorrect publicKey type",
        );
      }
    });
  });
});
