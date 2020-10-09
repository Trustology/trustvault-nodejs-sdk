import { Transaction as EthereumTx } from "ethereumjs-tx";
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
   * @returns {SignRequest}
   */
  public async getSignRequests(sign: SignCallback): Promise<SignRequest[]> {
    const digest: Buffer = this.generateTransactionDigest();
    const signData = getTransactionSignDataDigest(digest, this.hdWalletPath);
    const signRequest = await createSignRequest(digest, this.hdWalletPath, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  /**
   * Verifies the input and the output change address is as expected
   * @throws - throws an error input and the output change address is as expected
   */
  public validate(expectedFromAddress: HexString, expectedToAddress: HexString, expectedAmount: IntString): boolean {
    let toAddress = this.to;
    let fromAddress = this.fromAddress;
    let value = this.value;
    const isErc20Transaction = Boolean(this.data);

    if (isErc20Transaction) {
      // get the toAddress in the data field;
      ({ fromAddress, toAddress, value } = this.getErc20TransactionDataDetails());
    }
    if (fromAddress !== expectedFromAddress) {
      throw new Error("Transaction from address is different from the expected from address");
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
   * method - transferFrom(address from, address to, uint tokens)
   * data - 4 bytes / 32 bytes / 32 bytes / 32 bytes
   */
  private getErc20TransactionDataDetails(): EthTransactionDataDetails {
    if (!this.data) {
      throw new Error("Transaction data field missing");
    }
    return {
      fromAddress: toChecksumAddress("0x" + this.data.slice(34, 74)),
      toAddress: toChecksumAddress("0x" + this.data.slice(98, 138)),
      value: this.data.slice(138, 202),
    };
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
  private generateTransactionDigest(): Buffer {
    // Convert to raw transaction (hex values)
    const rawTransaction: EthRawTransaction = this.constructRawTransaction();

    // Get transactionDigest
    const ethTransaction = new EthereumTx(rawTransaction, { chain: this.chainId });
    return ethTransaction.hash(false);
  }
}
