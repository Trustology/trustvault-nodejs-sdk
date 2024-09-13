import bech32 from "bech32";
import { encodeCanonical } from "cbor";
import { blake2b } from "ethereum-cryptography/blake2b.js";
import { NIST_P_256_CURVE } from "../../static-data";
import {
  CardanoTransactionCreatedWebhookMessage,
  CardanoTransactionType,
  RequestClass,
  SignCallback,
  SignDataBuffer,
  SignRequest,
} from "../../types";
import { getTransactionSignDataDigest, verifyPublicKeySignaturePair } from "../signature";

export class CardanoTransaction implements RequestClass {
  private readonly delegateSignData: (typeof this.transaction)["signData"]["delegateSignData"];
  private readonly transactionType: CardanoTransactionType;

  constructor(private transaction: CardanoTransactionCreatedWebhookMessage["payload"]) {
    this.delegateSignData = this.transaction.signData.delegateSignData;
    this.transactionType = this.transaction.signData.data.type;
  }

  async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const signRequests: SignRequest[] = [];
    const signData = this.constructSignData();

    for (const delegateData of signData) {
      const pubSigPair = await sign(delegateData, { requestId });

      // verify the public key signature pair that the sign callback returned is correct
      verifyPublicKeySignaturePair(delegateData.shaSignData, pubSigPair, NIST_P_256_CURVE);

      const signRequest = {
        publicKeySignaturePairs: [
          { publicKey: pubSigPair.publicKey.toString("hex"), signature: pubSigPair.signature.toString("hex") },
        ],
      };

      signRequests.push(signRequest);
    }

    return signRequests;
  }

  validateResponse(...args: any[]): boolean {
    const constructedSignData = this.constructSignData();

    constructedSignData.map((data, index) => {
      const delegateSignData = this.delegateSignData[index].unverifiedMessageData;

      const isDigestCorrect = this.constructExpectedDigest().toString("hex") === delegateSignData.message;
      const isSignDataCorrect = data.signData.toString("hex") === delegateSignData.signData;
      const isShaSignDataCorrect = data.shaSignData.toString("hex") === delegateSignData.shaSignData;

      const isValid = isDigestCorrect && isSignDataCorrect && isShaSignDataCorrect;

      if (!isValid) {
        throw new Error(
          `The reconstructed transaction does not match the expected values: ${JSON.stringify({
            reconstructedMessage: {
              message: this.constructExpectedDigest().toString("hex"),
              signData: data.signData.toString("hex"),
              shaSignData: data.shaSignData.toString("hex"),
            },
            webhookData: {
              ...delegateSignData,
            },
          })}`,
        );
      }
    });

    return true;
  }

  public constructExpectedDigest(): Buffer {
    const cbor = this.encodeTransactionBody();

    return Buffer.from(blake2b(cbor, 32));
  }

  private constructSignData(): SignDataBuffer[] {
    const digest = this.constructExpectedDigest();
    return this.delegateSignData.map((data) => getTransactionSignDataDigest(digest, data.hdWalletPath, data.algorithm));
  }

  private encodeTransactionBody(): Buffer {
    const body = new Map();

    body.set(0, this.constructInputs());
    body.set(1, this.constructOutputs());
    body.set(2, this.constructFee());
    body.set(3, this.constructTtl());

    if (["STAKE", "UNSTAKE"].includes(this.transactionType)) {
      body.set(4, this.constructCertificates());
    }

    if (["WITHDRAWAL"].includes(this.transactionType)) {
      body.set(5, this.constructWithdrawals());
    }

    return encodeCanonical(body);
  }

  private fromBech32Address(address: string): Buffer {
    return Buffer.from(bech32.fromWords(bech32.decode(address, 1000).words));
  }

  private networkTagFromAddressBytes(addressBytes: Buffer): string {
    return addressBytes.toString("hex").charAt(1);
  }

  private constructInputs(): (Buffer | number)[][] {
    const { inputs } = this.transaction.signData.data;

    return inputs.map((input) => [Buffer.from(input.transactionId, "hex"), parseInt(input.index, 16)]);
  }

  private constructOutputs(): (Buffer | bigint)[][] {
    const { outputs } = this.transaction.signData.data;

    return outputs.map((output) => {
      const address = this.fromBech32Address(output.address);
      const coin = BigInt(output.amount.coin);

      return [address, coin];
    });
  }

  private constructFee(): bigint {
    return BigInt(this.transaction.signData.data.fee);
  }

  private constructTtl(): bigint {
    return BigInt(this.transaction.signData.data.ttl);
  }

  private constructCertificates(): (number | Buffer | (number | Buffer)[])[][] | undefined {
    const { certificates } = this.transaction.signData.data;
    const body = [];

    if (certificates?.includes("stakeRegistration")) {
      body.push(this.constructStakeKey(0));
    }

    if (certificates?.includes("stakeDeregistration")) {
      body.push(this.constructStakeKey(1));
    }

    if (certificates?.includes("stakeDelegation")) {
      body.push(this.constructStakeDelegation());
    }

    if (body.length === 0) {
      return;
    } else {
      return body;
    }
  }

  private constructStakeKey(type: number): (number | (number | Buffer)[])[] {
    const publicKey = this.transaction.signData.data.publicKeys?.stakePublicKey;
    const publicKeyHash = Buffer.from(blake2b(Buffer.from(publicKey!, "hex"), 28));

    return [type, [0, publicKeyHash]];
  }

  private constructStakeDelegation() {
    const { stakePublicKey, poolId } = this.transaction.signData.data.publicKeys!;

    const publicKeyHash = Buffer.from(blake2b(Buffer.from(stakePublicKey!, "hex"), 28));
    const poolKeyHash = this.fromBech32Address(poolId!);

    return [2, [0, publicKeyHash], poolKeyHash];
  }

  private constructWithdrawals(): Map<Buffer, bigint> {
    const { outputs, withdrawalAmount, publicKeys } = this.transaction.signData.data;

    const withdrawalAddressBytes = this.fromBech32Address(outputs[0].address);
    const networkTag = this.networkTagFromAddressBytes(withdrawalAddressBytes);

    const publicKeyHash = Buffer.from(blake2b(Buffer.from(publicKeys?.stakePublicKey!, "hex"), 28));
    const withdrawalAmountBigInt = BigInt(withdrawalAmount!);

    const map = new Map();
    map.set(Buffer.concat([Buffer.from("E" + networkTag, "hex"), publicKeyHash]), withdrawalAmountBigInt);

    return map;
  }
}
