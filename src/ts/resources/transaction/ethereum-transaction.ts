import * as EthereumTransactionLib from "ethereumjs-tx";
import { toChecksumAddress } from "ethereumjs-util";
import {
  EthereumSignData,
  EthRawTransaction,
  EthTransactionDataDetails,
  HdWalletPath,
  HexString,
  Integer,
  IntString,
  RequestClass,
  SignCallback,
  SignRequest,
  TransactionDigestData,
} from "../../types";
import { numberToHex } from "../../utils";
import { createSignRequest, getTransactionSignDataDigest } from "../signature";

export class EthereumTransaction implements RequestClass {
  public readonly fromAddress: HexString;
  public readonly to: HexString;
  public readonly nonce: Integer;
  public readonly gasPrice: IntString;
  public readonly gasLimit: IntString;
  public readonly chainId: Integer;
  public readonly value: IntString;
  public readonly contractAddress?: HexString;
  public readonly data?: HexString;
  public r?: HexString;
  public s?: HexString;
  public v?: HexString;
  public readonly hdWalletPath: HdWalletPath;
  public readonly unverifiedDigestData: TransactionDigestData;

  constructor({ transaction, unverifiedDigestData, hdWalletPath }: EthereumSignData) {
    this.nonce = transaction.nonce;
    this.gasPrice = transaction.gasPrice;
    this.gasLimit = transaction.gasLimit;
    this.chainId = transaction.chainId;
    this.data = transaction.data;
    this.fromAddress = transaction.fromAddress;
    this.to = transaction.to;
    this.value = transaction.value;
    this.unverifiedDigestData = unverifiedDigestData;
    this.hdWalletPath = hdWalletPath;
  }

  /**
   * Invokes the sign callback with the generated transaction sign data
   * @param  {string} requestId
   * @param  {SignCallback} sign
   * @returns Promise<SignRequest[]>
   */
  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const digest: Buffer = this.generateTransactionDigest();
    const signData = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const signRequest = await createSignRequest(requestId, digest, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  /**
   * Verifies the input and the output change address is as expected
   * @throws - throws an error input and the output change address is as expected
   */
  public validateResponse(expectedToAddress: HexString, expectedAmount: IntString): boolean {
    let toAddress = this.to;
    let value = this.value;
    const isErc20Transaction = Boolean(this.data);

    if (isErc20Transaction) {
      // get the toAddress in the data field;
      ({ toAddress, value } = this.getErc20TransactionDataDetails());
      value = String(parseInt(value, 16));
    }
    if (toAddress !== expectedToAddress) {
      throw new Error("Transaction recipient address is different from the expected to address");
    }
    if (value !== expectedAmount) {
      throw new Error("Transaction amount is different from the expected amount");
    }

    return true;
  }

  /**
   * method - transfer(address to, unit256 tokens)
   * data - 4 bytes / 32 bytes / 32 bytes
   */
  private getErc20TransactionDataDetails(): EthTransactionDataDetails {
    if (!this.data) {
      throw new Error("Transaction data field missing");
    }
    // transfer is only supported
    if (this.data.slice(0, 10) === "0xa9059cbb") {
      return {
        toAddress: toChecksumAddress("0x" + this.data.slice(34, 74)),
        value: this.data.slice(75, 139),
      };
    }
    throw new Error("Could not validate transaction as it was not for a transfer(adddress to, unit256 tokens)");
  }

  private constructRawTransaction(): EthRawTransaction {
    const transaction: EthRawTransaction = {
      chainId: this.chainId,
      gasLimit: numberToHex(this.gasLimit),
      gasPrice: numberToHex(this.gasPrice),
      nonce: numberToHex(this.nonce),
      to: this.to,
      v: this.v,
      data: this.data,
      value: numberToHex(this.value),
    };

    return transaction;
  }

  /**
   * Returns a sha3-256 hash of the serialized tx
   */
  public generateTransactionDigest(): Buffer {
    // Convert to raw transaction (hex values)
    const rawTransaction: EthRawTransaction = this.constructRawTransaction();

    // Get transactionDigest
    const ethTransaction = new EthereumTransactionLib(rawTransaction);
    return ethTransaction.hash(false);
  }
}
