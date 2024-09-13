import { createHash } from "crypto";
import { encodeForSigning, Payment } from "xrpl";
import {
  RequestClass,
  SignableMessageData,
  SignCallback,
  SignRequest,
  TrustVaultRippleTransaction,
  TrustVaultRippleTransactionSchema,
} from "../../types";
import { createSignRequest, getTransactionSignDataDigest } from "../signature";

export class RippleTransaction implements RequestClass {
  public readonly requestId: string;
  public readonly payment: Payment;
  public readonly signData: SignableMessageData<TrustVaultRippleTransaction>;

  constructor({
    requestId,
    signData,
  }: {
    requestId: string;
    signData: SignableMessageData<TrustVaultRippleTransaction>;
  }) {
    this.requestId = requestId;

    /* Validate the transaction input data using the ZodSchema */
    this.payment = this.validateRequestAndMapToPayment(signData.data);
    this.signData = signData;
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
    return createHash("sha512")
      .update(Buffer.from(encodeForSigning(this.payment), "hex"))
      .digest()
      .subarray(0, 32);
  };

  /**
   * Invokes the sign callback with the generated transaction sign data
   * @param  {string} requestId
   * @param  {SignCallback} sign
   * @returns Promise
   */
  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    return Promise.all(
      this.signData.delegateSignData.map(async (delegateSignData) => {
        const digest: Buffer = this.constructExpectedDigest();
        const signData = getTransactionSignDataDigest(digest, delegateSignData.hdWalletPath);
        return createSignRequest(requestId, digest, delegateSignData.unverifiedMessageData, signData, sign);
      }),
    );
  }

  public validateResponse(...args: any[]): boolean {
    for (const delegateSignData of this.signData.delegateSignData) {
      const digest: Buffer = this.constructExpectedDigest();
      const { signData, shaSignData } = getTransactionSignDataDigest(digest, delegateSignData.hdWalletPath);
      const isSignDataCorrect = signData.toString("hex") === delegateSignData.unverifiedMessageData.signData;
      const isShaSignDataCorrect = shaSignData.toString("hex") === delegateSignData.unverifiedMessageData.shaSignData;
      const isDigestCorrect = digest.toString("hex") === delegateSignData.unverifiedMessageData.message;
      const allDigestsAreCorrect = isSignDataCorrect && isShaSignDataCorrect && isDigestCorrect;
      if (!allDigestsAreCorrect) {
        throw new Error(
          `The reconstructed digest data does not match with the expected values: ${JSON.stringify({
            reconstructedDigest: {
              digest: digest.toString("hex"),
              signData: signData.toString("hex"),
              shaSignData: shaSignData.toString("hex"),
            },
            expectedDigest: delegateSignData.unverifiedMessageData,
          })}`,
        );
      }
    }
    return true;
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
