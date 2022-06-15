import * as AWS from "aws-sdk";
import { PublicKeySignaturePairBuffer, SignCallback, SignDataBuffer } from "../types";
import { derDecodePublicKey, derDecodeSignature } from "../utils/decoder/asn1-der";

/**
 * This example shows how to use AWS KMS to sign data. This class will ensure that:
 * - The KMS key used is the correct type (SIGN_VERIFY)
 * - The KMS key is on the correct curve (ECC_NIST_P256)
 * - The KMS key signs data with the correct alogrithm (ECDSA_SHA_256)
 * This class will also handle converting the encoded PublicKey types and Signature types into the format the TrustVault SDK expects.
 */

/**
 * The interface that all KeySigning functions must implement. Sign either the  *ONE* of the digests most suitable to sign with your signing process
 * rawDigest - the raw digest that  must be signed. Use if your signing process only allows a raw digest.
 * shaDigest - the SHA_256 hash of the digest that must be signed. Use if your signing process can sign Hashed data
 *
 * Return a PublicKeySignaturePair object which includes the uncompressed public Key and the signature. The signature is the r and s values concateneated together
 */
export interface KeyStore {
  sign: SignCallback;
}

/**
 * This class is an example class for wrapping an AWS KMS Key
 * This will ensure that the key is in a usable state and uses the correct key signing alogrithm
 * NOTE:
 * All methods here MUST be a defined using arrow functions so the `this` context gets correctly
 * bound to the class and not get lost when the methods are passed to another function
 */
export class AwsKmsKeyStore implements KeyStore {
  // The AWS KMS publicKey is returned in DER format which matches the SubjectPublicKeyInfo of this ASN.1 spec
  // https://docs.microsoft.com/en-us/windows/win32/seccertenroll/about-asn-1-type-system
  private kms = new AWS.KMS({ apiVersion: "2014-11-01", region: "eu-west-1" });

  public awsKeyId: string;
  public publicKey?: Buffer;
  private validated: boolean = false;

  constructor(awsKeyId: string) {
    this.awsKeyId = awsKeyId;
  }

  /**
   * Sign a message in bytes. This will use the message but this can easily be swapped to sign the shaDigest. The method will be called by the TrustVault SDK when something needs signing
   * @param message
   * @param shaDigest
   */
  public sign = async ({ signData }: SignDataBuffer): Promise<PublicKeySignaturePairBuffer> => {
    const message = signData;
    // validate this KMS key can be used for TrustVault signing operations
    if (!this.validated) {
      await this.validate();
    }
    // AWS KMS parameters
    const params: AWS.KMS.SignRequest = {
      KeyId: this.awsKeyId,
      Message: message,
      SigningAlgorithm: "ECDSA_SHA_256",
      MessageType: "RAW",
    };

    // not required but tells TS the publicKey isn't undefined
    if (!this.publicKey) {
      this.publicKey = await this.getPublicKey();
    }

    try {
      // sign using the rawDigest
      const sig = await this.kms.sign(params).promise();
      // check its actually signed by the correct algorithm
      if (sig.SigningAlgorithm && sig.SigningAlgorithm === "ECDSA_SHA_256") {
        const signature = sig.Signature;
        if (signature) {
          // convert the the buffer into a hex string
          const hexSignature = signature.toString("hex");
          // decode the DER signature to extract the r and s
          const { r, s } = derDecodeSignature(Buffer.from(hexSignature, "hex"));
          const paddedR = Buffer.from(r.toString("hex").padStart(64, "0"), "hex");
          const paddedS = Buffer.from(s.toString("hex").padStart(64, "0"), "hex");
          const pubKeyPair: PublicKeySignaturePairBuffer = {
            publicKey: this.publicKey,
            signature: Buffer.concat([paddedR, paddedS]),
          };
          return pubKeyPair;
        }
      }
    } catch ({ message, stack, code }) {
      console.error(`Error Signing Data: ${JSON.stringify({ message, stack, code })}`);
    }
    throw Error(`SIGNATURE_ERROR: Signature not returned`);
  };

  /**
   * Returns the publicKey associated with this KMS key. The key required for TrustVault is in uncompressed format
   * i.e. `04` hex prefixed + 64 bytes
   */
  public getPublicKey = async (): Promise<Buffer> => {
    if (!this.validated) {
      await this.validate();
    }
    if (this.publicKey) {
      return this.publicKey;
    }
    try {
      const key = await this.kms
        .getPublicKey({
          KeyId: this.awsKeyId,
        })
        .promise();
      // check the response from AWS
      if (key && key.PublicKey) {
        const publicKeyDer = key.PublicKey;
        const publicKeyHex = publicKeyDer?.toString("hex");

        // decode the DER encoded PublicKey info
        const decodedPublicKey = derDecodePublicKey(Buffer.from(publicKeyHex, "hex"));
        // check this publicKey is using the correct algorithm and paramters otherwise it cannot be used for TrustVault
        if (
          decodedPublicKey?.algorithmIdentifier.algorithm === "1.2.840.10045.2.1" &&
          decodedPublicKey?.algorithmIdentifier.parameters === "1.2.840.10045.3.1.7"
        ) {
          return decodedPublicKey.subjectPublicKey;
        }
      }
    } catch ({ code, message, stack }) {
      console.error(
        "PublicKey could not be decoded correctly or was incorrect publicKey type\n",
        `Error: ${JSON.stringify({ code, message, stack })}`,
      );
      throw Error("PublicKeyEncodingError: PublicKey could not be decoded correctly or was not retrieved from AWS");
    }
    throw Error("PublicKeyNotFound: PublicKey could not be decoded or incorrect publicKey type");
  };

  /**
   * Validate this KMS Key is a valid key for suitable signing for TrustVault
   */
  private validate = async () => {
    let errorMessage = "";
    try {
      const key = await this.kms
        .describeKey({
          KeyId: this.awsKeyId,
        })
        .promise();
      if (key.KeyMetadata?.Enabled !== true) {
        errorMessage = `Key ${this.awsKeyId} is not enabled`;
      } else {
        if (key.KeyMetadata?.CustomerMasterKeySpec !== "ECC_NIST_P256") {
          errorMessage = `Key ${this.awsKeyId} is not correct type, must be ECC_NIST_P256 but is ${key.KeyMetadata?.CustomerMasterKeySpec}`;
        } else {
          if (key.KeyMetadata.KeyUsage !== "SIGN_VERIFY") {
            errorMessage = `Key ${this.awsKeyId} does not have the correct usage type.`;
          }
        }
      }
      if (!errorMessage) {
        this.validated = true;
        this.publicKey = await this.getPublicKey();
      }
    } catch (e) {
      errorMessage = `Key ${this.awsKeyId} has an unknown validation error: ${e.message}`;
    }
    if (errorMessage) {
      throw Error(errorMessage);
    }
  };
}
