import { TrustVaultGraphQLClient } from "../../api-client";
import {
  BitcoinSignData,
  CreateChangePolicyRequestResponse,
  Environment,
  EthereumSignData,
  EthereumSignMessageCreated,
  EthereumSignMessageWebhookType,
  HexString,
  Integer,
  IntString,
  PolicySchedule,
  SignCallback,
  SignRequest,
  TransactionSpeed,
  TrustVaultRequest,
} from "../../types";
import { EthereumSignMessage } from "../sign-message/ethereum-sign-message";
import { BitcoinTransaction, EthereumTransaction } from "../transaction";
import { RippleTransaction } from "../transaction/ripple-transaction";
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
  const signRequests: SignRequest[] = await request.getSignRequests(requestId, sign);

  // submit signatures
  const id = await tvGraphQLClient.addSignature({
    requestId,
    signRequests,
  });
  console.log(`id: ${id}`);

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
  bitcoinTransactionRequest.request.validateResponse(subWalletId, toAddress, amount);

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

/**
 * Create an Ethereum Transaction request
 * @param fromAddress - the address to send the ethereum transaction from (0x prefixed hex string)
 * @param toAddress - the recipient address of the ethereum transaction (0x prefixed hex string)
 * @param amount - amount in smallest denominator unit of the asset (i.e. wei in ETH)
 * @param assetSymbol - see below for the supported ETH asset symbols
 * @param speed - optional, the speed of the transaction (defaults to 'MEDIUM')
 * @param currency - optional, the currency you want the transaction value to be converted to for verification (defaults to 'GBP)
 *                   "GBP" | "USD" | "EUR" | "AED" | "CHF" | "CNY" | "JPY" + supported tokens (see below)
 * @param tvGraphQLClient
 * @param gasPrice - optional, the gasPrice to set for the transaction, decimal integer string in WEI
 * @param gasLimit - optional, the gasLimit to set for the transaction, decimal integer string
 * @param nonce - optional, the nonce for this transaction. Use with caution.
 * @param chainId - optional, the integer chainId for this transaction. e.g. 1 = default (mainnet), 56 = Binance Smart Chain
 * @see https://help.bitpandacustody.com/en/articles/3123653-what-token-s-do-we-support
 */
export const createEthereumTransaction = async (
  fromAddress: HexString,
  toAddress: HexString,
  amount: IntString,
  assetSymbol: string | undefined,
  speed: TransactionSpeed,
  currency: string,
  tvGraphQLClient: TrustVaultGraphQLClient,
  gasPrice?: string,
  gasLimit?: string,
  nonce?: Integer,
  chainId?: Integer,
  sendToNetworkWhenSigned: boolean = true,
  sendToDevicesForSigning: boolean = true,
): Promise<TrustVaultRequest> => {
  const { requestId, signData } = await tvGraphQLClient.createEthereumTransaction(
    fromAddress,
    toAddress,
    amount,
    assetSymbol,
    speed,
    currency,
    gasPrice,
    gasLimit,
    nonce,
    chainId,
    sendToNetworkWhenSigned,
    sendToDevicesForSigning,
  );
  const ethereumTransactionRequest = constructEthereumTransactionRequest(requestId, signData);

  // validate the created transaction request against inputs
  ethereumTransactionRequest.request.validateResponse(toAddress, amount);

  return ethereumTransactionRequest;
};

export const constructEthereumTransactionRequest = (
  requestId: string,
  signData: EthereumSignData,
): TrustVaultRequest => ({
  requestId,
  request: new EthereumTransaction(signData),
});

export const constructEthereumSignMessageRequest = (
  type: EthereumSignMessageWebhookType,
  webhookPayload: EthereumSignMessageCreated,
): TrustVaultRequest => ({
  requestId: webhookPayload.requestId,
  request: new EthereumSignMessage(type, webhookPayload.signData),
});


// Ripple

export const createRippleTransaction = async (
  destination: HexString,
  amount: IntString,
  subWalletId: string,
  tvGraphQLClient: TrustVaultGraphQLClient,
): Promise<TrustVaultRequest> => {
  const { requestId, signData } = await tvGraphQLClient.createRippleTransaction(destination, amount, subWalletId);
  const rippleTransactionRequest = constructRippleTransactionRequest(requestId, signData);

  // validate the created transaction against the inputs
  // rippleTransactionRequest.request.validateResponse(subWalletId, toAddress, amount);

  return rippleTransactionRequest;
};

export const constructRippleTransactionRequest = (
  requestId: string,
  signData: any,
): TrustVaultRequest => ({
  requestId,
  request: new RippleTransaction(signData),
});

// Change Policy

export const createChangePolicyRequest = async (
  walletId: string,
  newDelegateSchedules: PolicySchedule[],
  trustVaultPublicKey: Buffer,
  tvGraphQLClient: TrustVaultGraphQLClient,
): Promise<TrustVaultRequest> => {
  const createChangePolicyResponse = await tvGraphQLClient.createChangePolicyRequest(walletId, newDelegateSchedules);
  const changePolicyRequest = constructChangePolicyRequest(createChangePolicyResponse, trustVaultPublicKey);

  // validate the new schedule is the same delegate schedule that was asked & verify recovery schedule is signed by Trustology
  changePolicyRequest.request.validateResponse(newDelegateSchedules);

  return changePolicyRequest;
};

export const constructChangePolicyRequest = (
  createChangePolicyResponse: CreateChangePolicyRequestResponse,
  trustVaultPublicKey: Buffer,
): TrustVaultRequest => ({
  requestId: createChangePolicyResponse.requestId,
  request: new Policy(createChangePolicyResponse, trustVaultPublicKey),
});
