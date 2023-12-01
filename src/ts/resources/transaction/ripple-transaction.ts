// @ts-ignore
import * as bs58check from "bs58check"; // TODO: create a definition file for bs58check
import {
  IntString,
  RequestClass,
  SignCallback,
  SignRequest,
} from "../../types";
import { createSignRequest } from "../signature";
// import { getCompatibilityAddress, getCompressedPublicKey, getWalletIdFromSubWalletId } from "../../utils";
// import { createSignRequest, getTransactionSignDataDigest, verifyPublicKey } from "../signature";

export class RippleTransaction implements RequestClass {
  // public readonly destination: string;
  // public readonly amount: string;
  // public readonly subWalletId: string;
  public readonly signData: any;

  constructor(signData: any) {
    // this.destination = rippleTransactionResponse.destination;
    // this.amount = rippleTransactionResponse.amount;
    // this.subWalletId = rippleTransactionResponse.subWalletId;
    this.signData = signData;
  }


  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    // const signRequestPromises: Promise<SignRequest>[] = this.getDigests().map((digest, i) => {
    //   // Get the matching input path for each digest then create a sign request
    //   const matchingInput = this.inputs[i];
    //   const { path } = matchingInput.publicKeyProvenanceData;
    //   const signData = getTransactionSignDataDigest(digest, path);
    //   return createSignRequest(requestId, digest, matchingInput.unverifiedDigestData, signData, sign);
    // });
    // return Promise.all(signRequestPromises);
    return [(await createSignRequest(requestId, this.signData.transactionDigest, this.signData, this.signData, sign))];
    // return Promise.resolve([{
    //   publicKeySignaturePairs: [{  publicKey: "",signature: ""}]
    // }]);
  }

  /**
   * Validate the input and the output change address is as expected
   * Validates the transaction has the expected to / amount if given
   * @throws - throws an error input and the output change address is as expected
   */
  public validateResponse(subWalletId: string, expectedToAddress?: string, expectedAmount?: IntString): boolean {
    return true;
  }
}

