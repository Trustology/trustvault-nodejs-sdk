import { TrustVaultGraphQLClient } from "./api-client";
import { config } from "./config";
import {
  constructBitcoinTransactionRequest,
  constructChangePolicyRequest,
  constructEthereumTransactionRequest,
  createBitcoinTransaction,
  createChangePolicyRequest,
  createEthereumTransaction,
  processRequest,
} from "./resources/request";
import { verifyHmac } from "./resources/signature";
import { NIST_P_256_CURVE } from "./static-data";
import {
  AllWebhookMessages,
  Environment,
  HexString,
  IntString,
  RequestItem,
  SignCallback,
  SubWallet,
  TransactionSpeed,
  TrustVaultOptions,
  TrustVaultRequest,
} from "./types";
import {
  isValidBitcoinAddress,
  isValidEthereumAddress,
  isValidIntString,
  isValidPublicKey,
  isValidSubWalletId,
  isValidTransactionSpeed,
  isValidUuid,
} from "./utils";

export class TrustVault {
  private tvGraphQLClient: TrustVaultGraphQLClient;
  private url: string;
  private trustVaultPublicKey: Buffer;
  private env: Environment;

  constructor({ environment = "production", apiKey, timeout = 30_000, apiUrlOverride }: TrustVaultOptions) {
    if (!apiKey) {
      throw new Error("No apiKey provided");
    }
    const configuration = config[environment];
    if (!configuration) {
      throw new Error(`Invalid environment. Must be production or sandbox`);
    }

    this.env = environment;
    this.url = apiUrlOverride ? apiUrlOverride : configuration.url;
    this.trustVaultPublicKey = configuration.trustVaultPublicKey;
    this.tvGraphQLClient = new TrustVaultGraphQLClient({
      apiKey,
      url: this.url,
      timeout,
    });
  }

  /**
   * Validates the HMAC signature of the webhookPayload
   * @param {string} webhookPayload - the stringified body of the webhook request
   * @param {string} secret - the secret that TrustVault gave upon registering your webhook
   * @param {string} signatureHeader - the signature of the request body in the request headers (`X-Sha2-Signature`)
   * @throw - throws an error if the signature is incorrect
   */
  static validateWebhookSignature(webhookPayload: string, secret: string, signatureHeader: string): boolean {
    return verifyHmac(webhookPayload, secret, signatureHeader);
  }

  /**
   * Signs and submits the signature for the webhook payload passed
   * @param {AllWebhookMessages} webhookMessage - the webhook request message received
   * @param {SignCallback} sign - signCallback that will be called to sign the computed digest
   * @returns requestId
   */
  public signAndSubmitSignature(webhookMessage: AllWebhookMessages, sign: SignCallback): Promise<string> {
    let trustVaultRequest: TrustVaultRequest;

    switch (webhookMessage.type) {
      case "BITCOIN_TRANSACTION_CREATED":
        const btcPayload = webhookMessage.payload;
        trustVaultRequest = constructBitcoinTransactionRequest(btcPayload.requestId, btcPayload.signData, this.env);
        // validate input publicKeys and change address
        trustVaultRequest.request.validate(btcPayload.subWalletIdString);
        break;
      case "ETHEREUM_TRANSACTION_CREATED":
        const ethPayload = webhookMessage.payload;
        // no signature to validate
        trustVaultRequest = constructEthereumTransactionRequest(ethPayload.requestId, ethPayload.signData);
        break;
      case "POLICY_CHANGE_REQUEST_CREATED":
        trustVaultRequest = constructChangePolicyRequest(webhookMessage.payload, this.trustVaultPublicKey);
        // validate recoverer schedules
        trustVaultRequest.request.validate();
        break;
      default:
        // should not happen
        throw new Error(`Webhook message type not supported: ${(webhookMessage as AllWebhookMessages).type}`);
    }

    return processRequest(trustVaultRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Creates a request to change a wallet's current delegateSchedule with the 1 of 1 delegate schedule of the passed newPublicKey
   * @param {string} walletId - the wallet to change the current delegateSchedule
   * @param {HexString} newPublicKey - the publicKey to be the new delegate of the wallet (04 prefixed 128 characters hex string)
   * @param {SignCallback} sign - signCallback that will be called to sign the computed digest
   */
  public async replacePublicKeyInDefaultSchedule(
    walletId: string,
    newPublicKey: HexString,
    sign: SignCallback,
  ): Promise<string> {
    if (!isValidUuid(walletId)) {
      throw new Error("Invalid walletId");
    }
    if (!isValidPublicKey(newPublicKey, NIST_P_256_CURVE)) {
      throw new Error("Invalid publicKey");
    }

    const policyRequest = await createChangePolicyRequest(
      walletId,
      newPublicKey,
      this.trustVaultPublicKey,
      this.tvGraphQLClient,
    );
    return processRequest(policyRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Send a bitcoin transaction to trustVault
   * @param {string} subWalletId - the unique identifier of the subWallet to send the bitcoin transaction from
   * @param {string} toAddress - the recipient address of the bitcoin transaction
   * @param {IntString} amount - the amount in satoshi
   * @param {"SLOW"|"MEDIUM"|"FAST"} speed - defaults to 'MEDIUM'
   * @param {SignCallback} sign - signCallback that will be called to sign the computed digest(s)
   * @returns {String} requestId - the unique identifier for the request
   */
  public async sendBitcoin(
    subWalletId: string,
    toAddress: string,
    amount: IntString,
    speed: TransactionSpeed = "MEDIUM",
    sign: SignCallback,
  ): Promise<string> {
    // Validate inputs
    if (!isValidSubWalletId(subWalletId)) {
      throw new Error("Invalid subWalletId");
    }
    if (!isValidBitcoinAddress(toAddress, this.env)) {
      throw new Error("Invalid toAddress");
    }
    if (!isValidIntString(amount)) {
      throw new Error("Invalid amount");
    }
    if (!isValidTransactionSpeed(speed)) {
      throw new Error("Invalid fromWalletId");
    }
    if (typeof sign !== "function") {
      throw new Error("sign callback must be a function");
    }

    const btcTransactionRequest = await createBitcoinTransaction(
      subWalletId,
      toAddress,
      amount,
      speed,
      this.tvGraphQLClient,
      this.env,
    );
    return processRequest(btcTransactionRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Send an ethereum to trustVault
   * @param {HexString} fromAddress - the address to send the ethereum transaction from (0x prefixed hex string)
   * @param {HexString} toAddress - the recipient address of the ethereum transaction (0x prefixed hex string)
   * @param {IntString} amount - amount in smallest denominator unit of the asset (i.e. wei in ETH)
   * @param {string} assetSymbol - see below for the supported ETH asset symbols
   * @param {"SLOW"|"MEDIUM"|"FAST"} speed - optional, the speed of the transaction (defaults to 'MEDIUM')
   * @param {string} currency - optional, the currency you want the transaction value to be converted to for verification (defaults to 'GBP)
   *                   "GBP" | "USD" | "EUR" | "AED" | "CHF" | "CNY" | "JPY" + supported tokens (see below)
   * @param {SignCallback} sign - signCallback that will be called to sign the computed digest
   * @returns {String} requestId - the unique identifier for the request
   * @see: supported tokens: https://help.trustology.io/en/articles/3123653-what-token-s-do-we-support
   */
  public async sendEthereum(
    fromAddress: HexString,
    toAddress: HexString,
    amount: IntString,
    assetSymbol: string,
    speed: TransactionSpeed = "MEDIUM",
    currency: string,
    sign: SignCallback,
  ): Promise<string> {
    // Validate inputs
    if (!isValidEthereumAddress(fromAddress)) {
      throw new Error("Invalid fromAddress");
    }
    if (!isValidEthereumAddress(toAddress)) {
      throw new Error("Invalid toAddress");
    }
    if (!isValidIntString(amount)) {
      throw new Error("Invalid amount");
    }
    if (typeof assetSymbol !== "string") {
      throw new Error("Invalid assetSymbol");
    }
    if (!isValidTransactionSpeed(speed)) {
      throw new Error("Invalid fromWalletId");
    }
    const ethTransactionRequest = await createEthereumTransaction(
      fromAddress,
      toAddress,
      amount,
      assetSymbol,
      speed,
      currency,
      this.tvGraphQLClient,
    );
    return processRequest(ethTransactionRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Retrieve the list of subWallets associated with the API key
   */
  public async getSubWallets(): Promise<SubWallet[]> {
    const wallets: SubWallet[] = await this.tvGraphQLClient.getSubWallets();
    return wallets;
  }

  /**
   * Create a new bitcoin address for the given subWalletId
   * @param {string} subWalletId - the unique identifier for the subWallet which the new bitcoin address will be created from
   */
  public async createBitcoinAddress(subWalletId: string): Promise<string> {
    if (!isValidSubWalletId(subWalletId)) {
      throw new Error("Invalid subWalletId");
    }
    const address: string = await this.tvGraphQLClient.createBitcoinReceiveAddress(subWalletId);
    return address;
  }

  /**
   * Retrieve the request item associated with the given requestId
   * @param {string} requestId - the unique identifier for the request
   */
  public async getRequest(requestId: string): Promise<RequestItem> {
    if (!isValidUuid(requestId)) {
      throw new Error("Invalid requestId");
    }
    const request: RequestItem = await this.tvGraphQLClient.getRequest(requestId);
    return request;
  }
}