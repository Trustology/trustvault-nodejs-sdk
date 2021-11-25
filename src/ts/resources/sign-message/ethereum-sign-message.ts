import { keccak256 } from "ethereumjs-util";
import {
  DigestSignData,
  EthereumSignMessageSignData,
  EthereumSignMessageWebhookType,
  HdWalletPath,
  RequestClass,
  SignCallback,
  SignRequest,
} from "../../types";
import { createSignTypedDataDigest, validateSignTypedDataMessage } from "../../utils/ethereum";
import { createSignRequest, getTransactionSignDataDigest } from "../signature";

export class EthereumSignMessage implements RequestClass {
  private webhookType: EthereumSignMessageWebhookType;
  private message: string;
  private hdWalletPath: HdWalletPath;
  private unverifiedDigestData: DigestSignData;

  constructor(webhookType: EthereumSignMessageWebhookType, signData: EthereumSignMessageSignData) {
    this.webhookType = webhookType;
    this.message = signData.data.message;
    this.hdWalletPath = signData.hdWalletPath;
    this.unverifiedDigestData = signData.unverifiedDigestData;
  }

  /**
   * Invokes the sign callback with the generated transaction sign data
   * @param  {string} requestId
   * @param  {SignCallback} sign
   * @returns Promise
   */
  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const digest: Buffer = this.generateSignMessageDigest();
    const signData = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const signRequest = await createSignRequest(requestId, digest, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  /**
   * Verifies the unverifiedDigestData
   * @throws - throws an error if the unverifiedDigestData is not what is expected
   */
  public validateResponse(): boolean {
    const digest: Buffer = this.generateSignMessageDigest();
    const { signData, shaSignData } = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const areSignDigestsCorrect =
      signData.toString("hex") === this.unverifiedDigestData.signData &&
      shaSignData.toString("hex") === this.unverifiedDigestData.shaSignData &&
      digest.toString("hex") === this.unverifiedDigestData.digest;
    if (!areSignDigestsCorrect) {
      throw new Error(
        `The digest data produced does not match with the expected unverified digest from server: "${JSON.stringify({
          digest,
          signData,
          shaSignData,
          unverifiedDigestData: this.unverifiedDigestData,
        })}`,
      );
    }
    return areSignDigestsCorrect;
  }

  /**
   * Returns a sha3-256 hash of the encoded sign message
   */
  private generateSignMessageDigest(): Buffer {
    switch (this.webhookType) {
      case "ETHEREUM_PERSONAL_SIGN_CREATED":
        return this.generatePersonalSignDigest();
      case "ETHEREUM_SIGN_TYPED_DATA_CREATED":
        const signTypedData = validateSignTypedDataMessage(this.message);
        return createSignTypedDataDigest(signTypedData);
      default:
        throw new Error(`Webhook type ${this.webhookType} not supported`);
    }
  }

  private generatePersonalSignDigest(): Buffer {
    const encoding = this.message.startsWith("0x") ? "hex" : "utf-8";
    const messageToEncode = this.message.startsWith("0x") ? this.message.substring(2) : this.message;
    const encodedMessage = Buffer.from(messageToEncode, encoding);
    const prefix = Buffer.from("\u0019Ethereum Signed Message:\n" + encodedMessage.length.toString(), "utf-8");
    const digest = keccak256(Buffer.concat([prefix, encodedMessage]));
    return digest;
  }
}
