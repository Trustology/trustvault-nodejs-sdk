import { ZodSchema } from "zod";
import { Curve, RequestClass, SignableMessageData, SignCallback, SignDataBuffer, SignRequest } from "../../types";
import { getTransactionSignDataDigest, verifyPublicKeySignaturePair } from "../signature";

export abstract class SignableRequest<Data> implements RequestClass {
  public readonly requestId: string;
  public readonly data: Data;
  public readonly delegateSignData: SignableMessageData<Data>["delegateSignData"];

  constructor({ requestId, signData }: { requestId: string; signData: SignableMessageData<Data> }) {
    this.requestId = requestId;

    /* Validate the transaction input data using the ZodSchema */
    this.data = this.parseAndValidateData(signData.data);
    this.delegateSignData = signData.delegateSignData;
  }

  /**
   * ZodSchema which will be used to perform runtime validation against the structure of `data`
   */
  protected abstract getDataSchema(): ZodSchema<Data>;

  protected abstract getCurve(): Curve;

  /**
   * Construct the message to be signed
   * @returns {Buffer}
   */
  public abstract constructExpectedMessage(): Buffer;

  /**
   * Perform runtime validation of the structure of data and remove any extra props
   * @param {Data} data
   * @returns
   */
  protected parseAndValidateData(data: Data): Data {
    return this.getDataSchema().parse(data);
  }

  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const signRequests: SignRequest[] = [];
    const signData = this.constructSignData();

    for (const delegateData of signData) {
      const pubSigPair = await sign(delegateData, { requestId });

      // verify the public key signature pair that the sign callback returned is correct
      verifyPublicKeySignaturePair(delegateData.shaSignData, pubSigPair, this.getCurve());

      const signRequest = {
        publicKeySignaturePairs: [
          { publicKey: pubSigPair.publicKey.toString("hex"), signature: pubSigPair.signature.toString("hex") },
        ],
      };

      signRequests.push(signRequest);
    }

    return signRequests;
  }

  private constructSignData(): SignDataBuffer[] {
    const message = this.constructExpectedMessage();
    return this.delegateSignData.map((data) =>
      getTransactionSignDataDigest(message, data.hdWalletPath, data.algorithm),
    );
  }

  public validateResponse(): boolean {
    const message: Buffer = this.constructExpectedMessage();

    for (const delegateSignData of this.delegateSignData) {
      const { signData, shaSignData } = getTransactionSignDataDigest(
        message,
        delegateSignData.hdWalletPath,
        delegateSignData.algorithm,
      );

      const isSignDataCorrect = signData.equals(Buffer.from(delegateSignData.unverifiedMessageData.signData, "hex"));
      const isShaSignDataCorrect = shaSignData.equals(
        Buffer.from(delegateSignData.unverifiedMessageData.shaSignData, "hex"),
      );
      const isMessageCorrect = message.equals(Buffer.from(delegateSignData.unverifiedMessageData.message, "hex"));

      const isValid = isSignDataCorrect && isShaSignDataCorrect && isMessageCorrect;

      if (!isValid) {
        throw new Error(
          `The reconstructed message data does not match with the expected values: ${JSON.stringify({
            reconstructedMessage: {
              message: message.toString("hex"),
              signData: signData.toString("hex"),
              shaSignData: shaSignData.toString("hex"),
            },
            expectedMessage: delegateSignData.unverifiedMessageData,
          })}`,
        );
      }
    }

    return true;
  }
}
