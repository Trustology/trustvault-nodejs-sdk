import { Message, Transaction } from "@solana/web3.js";
import { stripHexPrefix } from "ethereumjs-util";
import { NIST_P_256_CURVE } from "../../static-data";
import { TrustVaultSolanaTransaction, TrustVaultSolanaTransactionSchema } from "../../types";
import { base58Encode } from "../../utils/base-58";
import { SignableRequest } from "../request/signable-request";

export class SolanaTransaction extends SignableRequest<TrustVaultSolanaTransaction> {
  protected getDataSchema() {
    return TrustVaultSolanaTransactionSchema;
  }

  protected getCurve() {
    return NIST_P_256_CURVE;
  }

  public constructExpectedMessage(): Buffer {
    return this.toSolanaTransaction(this.data).serializeMessage();
  }

  private toSolanaTransaction(request: TrustVaultSolanaTransaction): Transaction {
    const tx = TrustVaultSolanaTransactionSchema.parse(request);
    const message = new Message({
      ...tx,
      instructions: tx.instructions.map((instruction) => ({
        ...instruction,
        data: base58Encode(Buffer.from(stripHexPrefix(instruction.data), "hex")),
      })),
    });

    return Transaction.populate(message);
  }
}
