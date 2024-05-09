import { createHash } from "crypto";
import { isDeepStrictEqual } from "util";
import {
  CreateChangePolicyRequestResponse,
  HexString,
  PolicyScheduleArray,
  PolicyTemplate,
  RequestClass,
  SignCallback,
  SignData,
  SignDataBuffer,
  SignRequest,
} from "../../types";
import { copyPolicy, derEncodePolicy } from "../../utils";
import { createSignRequest, verifyRecovererSchedules } from "../signature";

export class Policy implements RequestClass {
  private policyTemplate: PolicyTemplate;
  private readonly unverifiedDigestData: SignData;
  private readonly recovererTrustVaultSignature: HexString;
  private readonly trustVaultRecoverersPublicKeys: Buffer[];

  // should the constructor take in the env (prod, sandbox) then get the trustVaultPublicKey from config?
  constructor(createPolicyChangeResponse: CreateChangePolicyRequestResponse, trustVaultRecoverersPublicKeys: Buffer[]) {
    this.policyTemplate = createPolicyChangeResponse.policyTemplate;
    this.unverifiedDigestData = createPolicyChangeResponse.unverifiedDigestData;
    this.recovererTrustVaultSignature = createPolicyChangeResponse.recovererTrustVaultSignature;
    this.trustVaultRecoverersPublicKeys = trustVaultRecoverersPublicKeys;
  }

  public async getSignRequests(requestId: string, sign: SignCallback): Promise<SignRequest[]> {
    const signData: SignDataBuffer = this.getSignData();
    const digest: Buffer = signData.shaSignData;
    const signRequest = await createSignRequest(requestId, digest, this.unverifiedDigestData, signData, sign);
    return [signRequest];
  }

  /**
   * Validates the recovererSchedules came from trustVault and if given, the newDelegateSchedules is in the delegate schedule
   * @param newDelegateSchedules
   */
  public validateResponse(newDelegateSchedules?: PolicyScheduleArray): boolean {
    if (newDelegateSchedules) {
      // copy the delegateSchedule that is in the policy to remove fields not needed
      const delegateScheduleInPolicy: PolicyScheduleArray | undefined = copyPolicy(
        this.policyTemplate.delegateSchedules,
      );
      if (!delegateScheduleInPolicy) {
        throw new Error(
          `PolicyTemplate delegateSchedules was not well formed ${JSON.stringify(
            this.policyTemplate.delegateSchedules,
          )}`,
        );
      } else {
        const isDelegateSchedulesInPolicyTemplate = isDeepStrictEqual(delegateScheduleInPolicy, newDelegateSchedules);
        if (!isDelegateSchedulesInPolicyTemplate) {
          throw new Error("PolicyTemplate delegateSchedules does not have the expected schedule");
        }
      }
    }

    verifyRecovererSchedules(
      this.policyTemplate.recovererSchedules,
      this.recovererTrustVaultSignature,
      this.trustVaultRecoverersPublicKeys,
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
