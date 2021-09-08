import { createHash } from "crypto";
import {
  CreateChangePolicyRequestResponse,
  HexString,
  PolicyTemplate,
  RequestClass,
  SignCallback,
  SignData,
  SignDataBuffer,
  SignRequest,
} from "../../types";
import { derEncodePolicy } from "../../utils";
import { createSignRequest, verifyRecovererSchedules } from "../signature";

export class Policy implements RequestClass {
  private policyTemplate: PolicyTemplate;
  private readonly unverifiedDigestData: SignData;
  private readonly recovererTrustVaultSignature: HexString;
  private readonly trustVaultPublicKey: Buffer;

  // should the constructor take in the env (prod, sandbox) then get the trustVaultPublicKey from config?
  constructor(createPolicyChangeResponse: CreateChangePolicyRequestResponse, trustVaultPublicKey: Buffer) {
    this.policyTemplate = createPolicyChangeResponse.policyTemplate;
    this.unverifiedDigestData = createPolicyChangeResponse.unverifiedDigestData;
    this.recovererTrustVaultSignature = createPolicyChangeResponse.recovererTrustVaultSignature;
    this.trustVaultPublicKey = trustVaultPublicKey;
  }

  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const signData: SignDataBuffer = this.getSignData();
    const digest: Buffer = signData.shaSignData;
    const signRequest = await createSignRequest(requestId, digest, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  /**
   * Validates the recovererSchedules came from trustVault and if given, the newDelegatePublicKey is in the delegate schedule
   * @param newDelegatePublicKey
   */
  public validate(newDelegatePublicKey?: HexString): boolean {
    // should we validate specifically that it should be 1 schedule and its 1 of 1?
    if (newDelegatePublicKey) {
      const isNewPublicKeyInDelegateSchedule = this.policyTemplate.delegateSchedules.some((schedule) =>
        schedule.some((clause) => clause.keys.includes(newDelegatePublicKey)),
      );
      if (!isNewPublicKeyInDelegateSchedule) {
        throw new Error("PolicyTemplate delegateSchedules does not have the expected publicKey");
      }
    }

    verifyRecovererSchedules(
      this.policyTemplate.recovererSchedules,
      this.recovererTrustVaultSignature,
      this.trustVaultPublicKey,
    );

    return true;
  }

  private getSignData(): SignDataBuffer {
    // DER encode the policy template
    const signData: Buffer = derEncodePolicy(this.policyTemplate);
    // hash the DER encoded policy template
    const shaSignData: Buffer = createHash("sha256").update(signData).digest();

    return {
      signData,
      shaSignData,
    };
  }
}
