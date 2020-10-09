import * as signature from "./resources/signature";
import * as transaction from "./resources/transaction";
import * as wallet from "./resources/wallet";
import { AwsKmsKeyStore } from "./sign-examples/aws-kms";
import { TrustVault } from "./trust-vault";
import * as decoder from "./utils/decoder";
import * as encoder from "./utils/encoder";

export * from "./types";
export { TrustVault, AwsKmsKeyStore, decoder, encoder, transaction, wallet, signature };
