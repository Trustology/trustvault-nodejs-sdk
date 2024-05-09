import { createHash } from "crypto";
import { encodeForSigning, Payment } from "xrpl";
import {
  HdWalletPath,
  RequestClass,
  SignCallback,
  SignRequest,
  TransactionDigestData,
  TrustVaultRippleTransaction,
  TrustVaultRippleTransactionSchema,
} from "../../types";
import { createSignRequest, getTransactionSignDataDigest } from "../signature";

export class RippleTransaction implements RequestClass {
  public readonly requestId: string;
  public readonly payment: Payment;
  public readonly unverifiedDigestData: TransactionDigestData;
  public readonly hdWalletPath: HdWalletPath;

  constructor({
    requestId,
    transaction: payment,
    unverifiedDigestData,
    hdWalletPath,
  }: {
    requestId: string;
    transaction: TrustVaultRippleTransaction;
    unverifiedDigestData: TransactionDigestData;
    hdWalletPath: HdWalletPath;
  }) {
    this.requestId = requestId;

    /* Validate the transaction input data using the ZodSchema */
    this.payment = this.validateRequestAndMapToPayment(payment);

    this.unverifiedDigestData = unverifiedDigestData;
    this.hdWalletPath = hdWalletPath;
  }

  /**
   * Constructs the expected digest of the XRP Payment Transaction:
   *
   * Takes the first 32 bytes of the SHA-512 hash of the encoded transaction,
   * and encodes in binary format.
   *
   * @returns {string} Expected Digest for the transaction
   */
  public constructExpectedDigest = (): Buffer => {
    return Buffer.from(
      createHash("sha512")
        .update(Buffer.from(encodeForSigning(this.payment), "hex"))
        .digest(),
      0,
      32,
    );
  };

  /**
   * Invokes the sign callback with the generated transaction sign data
   * @param  {string} requestId
   * @param  {SignCallback} sign
   * @returns Promise
   */
  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const digest: Buffer = this.constructExpectedDigest();
    const signData = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const signRequest = await createSignRequest(requestId, digest, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  public validateResponse(...args: any[]): boolean {
    const digest: Buffer = this.constructExpectedDigest();
    const { signData, shaSignData } = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const isSignDataCorrect = signData.toString("hex") === this.unverifiedDigestData.signData;
    const isShaSignDataCorrect = shaSignData.toString("hex") === this.unverifiedDigestData.shaSignData;
    const isDigestCorrect = digest.toString("hex") === this.unverifiedDigestData.transactionDigest;
    const allDigestsAreCorrect = isSignDataCorrect && isShaSignDataCorrect && isDigestCorrect;
    if (!allDigestsAreCorrect) {
      throw new Error(
        `The reconstructed digest data does not match with the expected values: "${JSON.stringify({
          reconstructedDigest: {
            digest,
            signData,
            shaSignData,
          },
          expectedDigest: this.unverifiedDigestData,
        })}`,
      );
    }
    return allDigestsAreCorrect;
  }

  /**
   * Validates the given XRP Payment Transaction request according to the ZodSchema
   * and maps to the xrpl.Payment type
   *
   * @param request The XRP Payment Transaction request
   * @throws {ZodError} If the request is invalid
   */
  private validateRequestAndMapToPayment(request: TrustVaultRippleTransaction): Payment {
    TrustVaultRippleTransactionSchema.parse(request);

    const transaction: Payment = {
      TransactionType: request.transactionType,
      Account: request.account,
      Destination: request.destination,
      Amount: BigInt(request.amount).toString(),
      Fee: BigInt(request.fee).toString(),
      Sequence: Number(request.sequence),
      SigningPubKey: request.signingPubKey,
    };

    if (request.destinationTag) {
      transaction.DestinationTag = parseInt(request.destinationTag, 16);
    }

    return transaction;
  }
}
