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
  GetSubWalletOptions,
  GetSubWalletsOptions,
  HexString,
  IntString,
  RequestItem,
  ResultConnection,
  SignCallback,
  SubWallet,
  TransactionSpeed,
  TrustVaultOptions,
  TrustVaultRequest,
} from "./types";
import {
  isValidBitcoinAddress,
  isValidIntString,
  isValidPublicKey,
  isValidSubWalletId,
  isValidTransactionSpeed,
  isValidUuid,
  validateInputs,
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
   * NOTE:
   * If sign callback is not given, the policy change request will not be signed and will stay
   * in `AWAITING_SIGNATURES` status. (i.e. will not be processed until enough valid signatures are collected)
   * @param {string} walletId - the wallet to change the current delegateSchedule
   * @param {HexString} newPublicKey - the publicKey to be the new delegate of the wallet (04 prefixed 128 characters hex string)
   * @param {SignCallback} [sign] - signCallback that will be called to sign the computed digest if given
   * @see https://developer.trustology.io/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async replacePublicKeyInDefaultSchedule(
    walletId: string,
    newPublicKey: HexString,
    sign?: SignCallback,
  ): Promise<string> {
    if (!isValidUuid(walletId)) {
      throw new Error("Invalid walletId");
    }
    if (!isValidPublicKey(newPublicKey, NIST_P_256_CURVE)) {
      throw new Error("Invalid publicKey");
    }
    if (sign && typeof sign !== "function") {
      throw new Error("sign callback must be a function");
    }

    const policyRequest = await createChangePolicyRequest(
      walletId,
      newPublicKey,
      this.trustVaultPublicKey,
      this.tvGraphQLClient,
    );
    if (!sign) {
      return policyRequest.requestId;
    }
    return processRequest(policyRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Send a bitcoin transaction to TrustVault
   * NOTE:
   * If the sign callback is not given, the created transaction request will not be signed and will stay
   * in `AWAITING_SIGNATURES` status (i.e. will not be submitted to the network until enough valid signatures are collected)
   * @param {string} subWalletId - the unique identifier of the subWallet to send the bitcoin transaction from
   * @param {string} toAddress - the recipient address of the bitcoin transaction
   * @param {IntString} amount - the amount in satoshi
   * @param {"SLOW"|"MEDIUM"|"FAST"} speed - defaults to 'MEDIUM'
   * @param {SignCallback} [sign] - signCallback that will be called to sign the computed digest(s) if given
   * @returns {String} requestId - the unique identifier for the request
   * @see https://developer.trustology.io/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async sendBitcoin(
    subWalletId: string,
    toAddress: string,
    amount: IntString,
    speed: TransactionSpeed = "MEDIUM",
    sign?: SignCallback,
  ): Promise<string> {
    // Validate inputs
    if (!isValidSubWalletId(subWalletId)) {
      throw new Error("Invalid subWalletId");
    }
    if (!isValidBitcoinAddress(toAddress, this.env)) {
      throw new Error("Invalid toAddress");
    }
    if (!isValidIntString(amount)) {
      throw new Error("Invalid amount, must be an integer string");
    }
    if (!isValidTransactionSpeed(speed)) {
      throw new Error("Invalid fromWalletId");
    }
    if (sign && typeof sign !== "function") {
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
    if (!sign) {
      return btcTransactionRequest.requestId;
    }
    return processRequest(btcTransactionRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Send an ethereum transaction to TrustVault
   * NOTE:
   * If the sign callback is not given, the created transaction request will not be signed and will stay
   * in `AWAITING_SIGNATURES` status (i.e. will not be submitted to the network until enough valid signatures are collected)
   * @param {HexString} fromAddress - the address to send the ethereum transaction from (0x prefixed hex string)
   * @param {HexString} toAddress - the recipient address of the ethereum transaction (0x prefixed hex string)
   * @param {IntString} amount - amount in smallest denominator unit of the asset (i.e. wei in ETH)
   * @param {string} assetSymbol - see below for the supported ETH asset symbols
   * @param {"SLOW"|"MEDIUM"|"FAST"} speed - optional, the speed of the transaction (defaults to 'MEDIUM')
   * @param {string} currency - optional, the currency you want the transaction value to be converted to for verification (defaults to 'GBP)
   *                   "GBP" | "USD" | "EUR" | "AED" | "CHF" | "CNY" | "JPY" + supported tokens (see below)
   * @param {SignCallback} [sign] - signCallback that will be called to sign the computed digest if given
   * @param gasPrice - optional, the gasPrice to set for the transaction, decimal integer string in WEI
   * @param gasLimit - optional, the gasLimit to set for the transaction, decimal integer string
   * @returns {String} requestId - the unique identifier for the request
   * @see https://help.trustology.io/en/articles/3123653-what-token-s-do-we-support
   * @see https://developer.trustology.io/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async sendEthereum(
    fromAddress: HexString,
    toAddress: HexString,
    amount: IntString,
    assetSymbol: string,
    speed: TransactionSpeed = "MEDIUM",
    currency: string,
    sign?: SignCallback,
    gasPrice?: string,
    gasLimit?: string,
  ): Promise<string> {
    validateInputs(fromAddress, toAddress, amount, assetSymbol, currency, speed, gasPrice, gasLimit, sign);

    const ethTransactionRequest = await createEthereumTransaction(
      fromAddress,
      toAddress,
      amount,
      assetSymbol,
      speed,
      currency,
      this.tvGraphQLClient,
      gasPrice,
      gasLimit,
    );
    if (!sign) {
      return ethTransactionRequest.requestId;
    }
    return processRequest(ethTransactionRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Retrieve the list of subWallets associated with the API key
   * @deprecated("Use getSubWalletsConnection to allow for pagination")
   */
  public async getSubWallets(): Promise<SubWallet[]> {
    const subWallets: SubWallet[] = await this.tvGraphQLClient.getSubWallets(true); // default to returning balances as non-breaking change
    return this.addWalletIdToWallet(subWallets);
  }

  /**
   * Retrieve the list of sub-wallets associated with the API key which can be paged
   * @param  {GetSubWalletsOptions={}} options including `limit` and `nextToken` for paging and `includeBalances` if balances are required
   * @returns Promise<ResultConnection<SubWallet[]>>
   */
  public async getSubWalletsConnection(options: GetSubWalletsOptions = {}): Promise<ResultConnection<SubWallet[]>> {
    const subWalletsConnection = await this.tvGraphQLClient.getSubWalletsConnection(options);
    subWalletsConnection.items = this.addWalletIdToWallet(subWalletsConnection.items);
    return subWalletsConnection;
  }

  /**
   * Retrieve a single subWallet
   * @param  {string} subWalletId- The subWalletId of the sub-wallet to return
   * @param  {GetSubWalletOptions={}} options including `includeBalances` if balances are required for this sub-wallet
   * @returns Promise<SubWallet>
   */
  public async getSubWallet(subWalletId: string, options: GetSubWalletOptions = {}): Promise<SubWallet> {
    const subWallet: SubWallet = await this.tvGraphQLClient.getSubWallet(subWalletId, options);
    return this.addWalletIdToWallet([subWallet])[0];
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

  /**
   * Cancels a request item associated with the given requestId. If successful, the request will be in `USER_CANCELLED` status
   * An error will be throw if the request is not in a state that can be cancelled (i.e. not `AWAITING_SIGNATURES`)
   * @param {string} requestId - the unique identifier for the request
   * @see https://developer.trustology.io/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async cancelRequest(requestId: string): Promise<boolean> {
    if (!isValidUuid(requestId)) {
      throw new Error("Invalid requestId");
    }
    const requestIdResponse: string = await this.tvGraphQLClient.cancelRequest(requestId);
    return requestIdResponse ? true : false;
  }

  private addWalletIdToWallet(wallets: SubWallet[]): SubWallet[] {
    return wallets.map((wallet) => {
      return {
        ...wallet,
        walletId: wallet.subWalletId.split("/")[0],
      };
    });
  }
}
