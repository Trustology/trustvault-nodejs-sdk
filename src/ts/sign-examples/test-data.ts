import * as AWSMock from "aws-sdk-mock";
import { GetPublicKeyRequest } from "aws-sdk/clients/cloudfront";
import { DescribeKeyRequest, SignRequest } from "aws-sdk/clients/kms";
import { TEST_PUBLICKEY_DER } from "../utils/asn1/asn1-test-data.spec";

// A Mocked Response from KMS describeKey
const mockKMSKeyDescribeWithValidData: AWS.KMS.DescribeKeyResponse = {
  KeyMetadata: {
    KeyId: "dummyKey",
    Enabled: true,
    CustomerMasterKeySpec: "ECC_NIST_P256",
    KeyUsage: "SIGN_VERIFY",
  },
};

// A Mocked response from KMS getPublicKey
const mockKMSKeyPublicKey: AWS.KMS.GetPublicKeyResponse = {
  PublicKey: TEST_PUBLICKEY_DER,
};

// A function to mock KMS describeKey and return the data required
export const mockKMSDescribe = (enabled: boolean = true, type = "SIGN_VERIFY") => {
  // copy the mockData so we don't interfere with other tests
  const mockData: AWS.KMS.DescribeKeyResponse = JSON.parse(JSON.stringify(mockKMSKeyDescribeWithValidData));

  // set the mock data that has been asked for
  mockData.KeyMetadata!.Enabled = enabled;
  mockData.KeyMetadata!.KeyUsage = type;

  AWSMock.mock(
    "KMS",
    "describeKey",
    (
      params: DescribeKeyRequest,
      callback: (err: AWS.AWSError | null, data: AWS.KMS.Types.DescribeKeyResponse) => void,
    ) => {
      //   console.info("KMS", "describeKey", "mock called");
      callback(null, mockData);
    },
  );
};

// A function to mock KMS publicKey and return the data
export const mockKMSPublicKey = (publicKeyReturnData = TEST_PUBLICKEY_DER) => {
  // copy the mockData so we don't interfere with other tests
  const mockData: AWS.KMS.GetPublicKeyResponse = JSON.parse(JSON.stringify(mockKMSKeyPublicKey));
  mockData.PublicKey = publicKeyReturnData;
  AWSMock.mock(
    "KMS",
    "getPublicKey",
    (
      params: GetPublicKeyRequest,
      callback: (err: AWS.AWSError | null, data: AWS.KMS.Types.GetPublicKeyResponse) => void,
    ) => {
      //   console.info("KMS", "getPublicKey", "mock called");
      callback(null, mockData);
    },
  );
};

export const mockKMSSign = (signingAlgorithm = "ECDSA_SHA_256", signature = Buffer.from("", "hex")) => {
  // copy the mockData so we don't interfere with other tests
  const mockData: AWS.KMS.SignResponse = {
    SigningAlgorithm: signingAlgorithm,
    Signature: signature,
  };

  AWSMock.mock(
    "KMS",
    "sign",
    (params: SignRequest, callback: (err: AWS.AWSError | null, data: AWS.KMS.Types.SignResponse) => void) => {
      //   console.info("KMS", "sign", "sign mock called");
      callback(null, mockData);
    },
  );
};
