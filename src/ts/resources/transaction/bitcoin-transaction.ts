import { address, networks, Payment, payments, Transaction } from "bitcoinjs-lib";
// @ts-ignore
import * as bs58check from "bs58check"; // TODO: create a definition file for bs58check
import { config } from "../../config";
import { SEC_P_256_K1_CURVE } from "../../static-data";
import {
  BitcoinInput,
  BitcoinNetwork,
  BitcoinOutput,
  BitcoinTransactionResponse,
  BITCOIN_NETWORKS,
  Curve,
  Environment,
  IntString,
  RequestClass,
  SignCallback,
  SignRequest,
} from "../../types";
import { getCompatibilityAddress, getCompressedPublicKey, getWalletIdFromSubWalletId } from "../../utils";
import { createSignRequest, getTransactionSignDataDigest, verifyPublicKey } from "../signature";

interface TransactionOptions {
  env: Environment;
}

export class BitcoinTransaction implements RequestClass {
  public readonly version: number;
  public readonly inputs: BitcoinInput[];
  public readonly outputs: BitcoinOutput[];
  public readonly lockTime: number;
  public readonly sighash: number;
  private network: BitcoinNetwork;
  private btcLibNetwork: networks.Network;
  private trustVaultPublicKey: Buffer;
  private curve: Curve;

  constructor(bitcoinTransactionResponse: BitcoinTransactionResponse, opts?: TransactionOptions) {
    const env = opts?.env || "production";
    const configuration = config[env];

    if (!configuration) {
      throw new Error(`Invalid environment: ${opts?.env}`);
    }

    this.network = configuration.bitcoinNetwork;
    this.trustVaultPublicKey = configuration.trustVaultPublicKey;
    this.btcLibNetwork = this.getBtcLibNetwork(this.network);
    this.version = bitcoinTransactionResponse.version;
    this.inputs = bitcoinTransactionResponse.inputs;
    this.outputs = bitcoinTransactionResponse.outputs;
    this.lockTime = bitcoinTransactionResponse.lockTime;
    this.sighash = bitcoinTransactionResponse.sighash;
    this.curve = SEC_P_256_K1_CURVE;
  }

  public setNetwork(network: BitcoinNetwork) {
    if (!BITCOIN_NETWORKS.includes(network)) {
      throw new Error("Network must be `bitcoin` or `testnet`");
    }
    this.network = network;
    this.btcLibNetwork = this.getBtcLibNetwork(network);
  }

  public async getSignRequests(sign: SignCallback): Promise<SignRequest[]> {
    const signRequestPromises: Promise<SignRequest>[] = this.getDigests().map((digest, i) => {
      // Get the matching input path for each digest then create a sign request
      const matchingInput = this.inputs[i];
      const { path } = matchingInput.publicKeyProvenanceData;
      const signData = getTransactionSignDataDigest(digest, path);
      return createSignRequest(digest, path, matchingInput.unverifiedDigestData, signData, sign);
    });
    return Promise.all(signRequestPromises);
  }

  public getDigests(): Buffer[] {
    if (!this.network) {
      throw new Error("Bitcoin network not set.");
    }
    const tx = new Transaction();
    tx.version = this.version;

    // Add tx inputs - use input "COMPRESSED" public key to generate scriptSig
    this.inputs.forEach(({ txId, sequence, publicKeyProvenanceData, outputIndex }) => {
      const hash = Buffer.from(reverseInput(txId), "hex");
      const reversedSequence = reverseSequence(sequence);
      const compressedPublicKey = getCompressedPublicKey(publicKeyProvenanceData.publicKey, this.curve);
      const scriptSig = Buffer.concat([
        Buffer.from("16", "hex"),
        lockingScript(compressedPublicKey, this.btcLibNetwork).output!,
      ]);
      tx.addInput(hash, outputIndex, reversedSequence, scriptSig);
    });

    this.outputs.forEach(({ recipientAddress, amountToSend }) => {
      tx.addOutput(address.toOutputScript(recipientAddress, this.btcLibNetwork), amountToSend);
    });

    const digests: Buffer[] = this.inputs.map((input, i) => this.getInputHash(tx, input, i));

    return digests;
  }

  /**
   * Validate the input and the output change address is as expected
   * Validates the transaction has the expected to / amount if given
   * @throws - throws an error input and the output change address is as expected
   */
  public validate(subWalletId: string, expectedToAddress?: string, expectedAmount?: IntString): boolean {
    const walletId = getWalletIdFromSubWalletId(subWalletId);
    // verify inputs
    this.inputs.forEach((input) => verifyPublicKey(walletId, input.publicKeyProvenanceData, this.trustVaultPublicKey));
    // verify change address
    this.outputs.forEach((output) => this.verifyChangeAddress(walletId, output));
    // verify toAddress
    if (expectedToAddress && this.outputs[0].recipientAddress !== expectedToAddress) {
      throw new Error("Transaction recipient address is different from the expected to address");
    }
    // verify amount
    if (expectedAmount && this.outputs[0].amountToSend !== Number(expectedAmount)) {
      throw new Error("transaction amount is different from the expected amount");
    }
    return true;
  }

  private verifyChangeAddress(walletId: string, { publicKeyProvenanceData, recipientAddress }: BitcoinOutput): boolean {
    if (!publicKeyProvenanceData) {
      // not a change output, nothing to verify
      return true;
    }

    // verify the publicKey came from TrustVault
    verifyPublicKey(walletId, publicKeyProvenanceData, this.trustVaultPublicKey);
    const verifiedPublicKey = publicKeyProvenanceData.publicKey;

    // derive the bitcoin change address from the verified publicKey
    const derivedAddress = getCompatibilityAddress(verifiedPublicKey, this.network);
    // Ensure the change output's recipientAddress matches the derived compatibility address from the verified public key
    if (recipientAddress !== derivedAddress) {
      throw new Error(
        `changeAddress mismatch. derivedAddress: ${derivedAddress}, output changeAddress: ${recipientAddress}`,
      );
    }

    // compare with the address in the output
    return true;
  }

  private getInputHash(tx: Transaction, input: BitcoinInput, index: number): Buffer {
    const { value, publicKeyProvenanceData } = input;
    const compressedPublicKey = getCompressedPublicKey(publicKeyProvenanceData.publicKey, this.curve);
    // get hash - use input "COMPRESSED" public key
    const p2pkh = payments.p2pkh({
      pubkey: Buffer.from(compressedPublicKey, "hex"),
    });
    const hash = tx.hashForWitnessV0(index, p2pkh!.output!, value, Transaction.SIGHASH_ALL);
    return hash;
  }

  private getBtcLibNetwork(network: BitcoinNetwork): networks.Network {
    switch (network) {
      case "bitcoin":
        return networks.bitcoin;
      default:
        return networks.testnet;
    }
  }
}

// Helpers

export const reverseInput = (input: string): string => {
  console.debug(`reverseInput called: input:${input}`);
  return (Buffer.from(input, "hex").reverse() as Buffer).toString("hex");
};

export const reverseSequence = (sequence: string): number => {
  console.debug(`reverseSequence called: sequence: ${sequence}`);
  const reverseHex = Buffer.from(sequence, "hex").reverse();
  return parseInt((reverseHex as Buffer).toString("hex"), 16);
};

export const lockingScript = (compressedPublicKey: string, network: networks.Network): Payment => {
  console.debug(`lockingScript called: compressedPublicKey: ${compressedPublicKey}`);
  const { redeem } = payments.p2sh({
    redeem: payments.p2wpkh({
      pubkey: Buffer.from(compressedPublicKey, "hex"),
      network,
    }),
    network,
  });
  return redeem!;
};
