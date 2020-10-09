import { TrustVaultGraphQLClient } from "../../api-client";
import {
  BitcoinSignData,
  CreateChangePolicyRequestResponse,
  Currency,
  Environment,
  EthereumSignData,
  HexString,
  IntString,
  SignCallback,
  SignRequest,
  TransactionSpeed,
  TrustVaultRequest,
} from "../../types";
import { BitcoinTransaction, EthereumTransaction } from "../transaction";
import { Policy } from "../wallet";

/**
 * Invokes the getSignRequests method on the passed request and submits the signature to trustVault
 * @param trustVaultRequest
 * @param sign
 * @param tvGraphQLClient
 */
export const processRequest = async (
  { request, requestId }: TrustVaultRequest,
  sign: SignCallback,
  tvGraphQLClient: TrustVaultGraphQLClient,
): Promise<string> => {
  if (typeof sign !== "function") {
    throw new Error("sign callback must be a function");
  }

  // create sign requests
  const signRequests: SignRequest[] = await request.getSignRequests(sign);

  // submit signatures
  const id = await tvGraphQLClient.addSignature({
    requestId,
    signRequests,
  });

  if (id !== requestId) {
    throw new Error(`id mismatch: ${JSON.stringify({ id, requestId })}`);
  }

  return requestId;
};

// Bitcoin

export const createBitcoinTransaction = async (
  subWalletId: string,
  toAddress: string,
  amount: IntString,
  speed: TransactionSpeed = "MEDIUM",
  tvGraphQLClient: TrustVaultGraphQLClient,
  env: Environment,
): Promise<TrustVaultRequest> => {
  const { requestId, signData } = await tvGraphQLClient.createBitcoinTransaction(subWalletId, toAddress, amount, speed);
  const bitcoinTransactionRequest = constructBitcoinTransactionRequest(requestId, signData, env);

  // validate the created transaction against the inputs
  bitcoinTransactionRequest.request.validate(subWalletId, toAddress, amount);

  return bitcoinTransactionRequest;
};

export const constructBitcoinTransactionRequest = (
  requestId: string,
  signData: BitcoinSignData,
  env: Environment,
): TrustVaultRequest => ({
  requestId,
  request: new BitcoinTransaction(signData.transaction, { env }),
});

// Ethereum

export const createEthereumTransaction = async (
  fromAddress: HexString,
  toAddress: HexString,
  amount: IntString,
  assetSymbol: string,
  speed: TransactionSpeed,
  currency: Currency,
  tvGraphQLClient: TrustVaultGraphQLClient,
): Promise<TrustVaultRequest> => {
  const { requestId, signData } = await tvGraphQLClient.createEthereumTransaction(
    fromAddress,
    toAddress,
    amount,
    assetSymbol,
    speed,
    currency,
  );
  const bitcoinTransactionRequest = constructEthereumTransactionRequest(requestId, signData);

  // validate the created transaction request against inputs
  bitcoinTransactionRequest.request.validate(fromAddress, toAddress, amount);

  return bitcoinTransactionRequest;
};

export const constructEthereumTransactionRequest = (
  requestId: string,
  signData: EthereumSignData,
): TrustVaultRequest => ({
  requestId,
  request: new EthereumTransaction(signData),
});

// Change Policy

export const createChangePolicyRequest = async (
  walletId: string,
  newDelegatePublicKey: HexString,
  trustVaultPublicKey: Buffer,
  tvGraphQLClient: TrustVaultGraphQLClient,
): Promise<TrustVaultRequest> => {
  const createChangePolicyResponse = await tvGraphQLClient.createChangePolicyRequest(walletId, newDelegatePublicKey);
  const changePolicyRequest = constructChangePolicyRequest(createChangePolicyResponse, trustVaultPublicKey);

  // validate the new publicKey is in the delegate schedule & verify recovery schedule
  changePolicyRequest.request.validate(newDelegatePublicKey);

  return changePolicyRequest;
};

export const constructChangePolicyRequest = (
  createChangePolicyResponse: CreateChangePolicyRequestResponse,
  trustVaultPublicKey: Buffer,
): TrustVaultRequest => ({
  requestId: createChangePolicyResponse.requestId,
  request: new Policy(createChangePolicyResponse, trustVaultPublicKey),
});
