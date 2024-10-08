import { TrustVaultGraphQLClient } from "./api-client";
import { config } from "./config";
import {
  constructBitcoinTransactionRequest,
  constructChangePolicyRequest,
  constructEthereumSignMessageRequest,
  constructEthereumTransactionRequest,
  createBitcoinTransaction,
  createChangePolicyRequest,
  createEthereumTransaction,
  processRequest,
} from "./resources/request";
import { verifyHmac, verifyPublicKey } from "./resources/signature";
import { CardanoTransaction } from "./resources/transaction/cardano-transaction";
import { RippleTransaction } from "./resources/transaction/ripple-transaction";
import { SolanaTransaction } from "./resources/transaction/solana-transaction";
import { NIST_P_256_CURVE } from "./static-data";
import {
  AllWebhookMessages,
  CreateSolanaActivateStakeTransactionVariables,
  CreateSolanaDeactivateStakeTransactionVariables,
  CreateSolanaInitialiseStakeTransactionVariables,
  CreateSolanaPaymentTransactionVariables,
  CreateSolanaSplitStakeTransactionVariables,
  CreateSolanaTokenPaymentTransactionVariables,
  CreateSolanaWithdrawStakeTransactionVariables,
  CreateSubWalletOptions,
  CreateSubWalletResponse,
  CreateSubWalletUnverifiedResponse,
  DelegateScheduleArray,
  Environment,
  GetSubWalletOptions,
  GetSubWalletsOptions,
  HexString,
  Integer,
  IntString,
  PolicySchedule,
  PublicKeyProvenance,
  ReceiveAddressDetails,
  RequestItem,
  ResultConnection,
  SignCallback,
  SubWallet,
  SubWalletType,
  SUB_WALLET_TYPES,
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
  pubToChecksumAddress,
  validateDelegateSchedule,
  validateInputs,
} from "./utils";

export class TrustVault {
  private tvGraphQLClient: TrustVaultGraphQLClient;
  private url: string;
  private trustVaultPublicKeys: Buffer[];
  private trustVaultRecoverersPublicKeys: Buffer[];
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
    this.trustVaultPublicKeys = configuration.trustVaultPublicKeys;
    this.trustVaultRecoverersPublicKeys = configuration.trustVaultRecoverersPublicKeys;
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
        trustVaultRequest.request.validateResponse(btcPayload.subWalletIdString);
        break;
      case "ETHEREUM_TRANSACTION_CREATED":
      case "BINANCE_SMART_CHAIN_TRANSACTION_CREATED":
      case "AVALANCHE_TRANSACTION_CREATED":
      case "POLYGON_TRANSACTION_CREATED":
      case "UNSUPPORTED_ETHEREUM_TRANSACTION_CREATED":
        const ethPayload = webhookMessage.payload;
        // no signature to validate
        trustVaultRequest = constructEthereumTransactionRequest(ethPayload.requestId, ethPayload.signData);

        break;
      case "ETHEREUM_PERSONAL_SIGN_CREATED":
      case "ETHEREUM_SIGN_TYPED_DATA_CREATED":
        const { type, payload } = webhookMessage;
        trustVaultRequest = constructEthereumSignMessageRequest(type, payload);
        break;
      case "POLICY_CHANGE_REQUEST_CREATED":
        trustVaultRequest = constructChangePolicyRequest(webhookMessage.payload, this.trustVaultRecoverersPublicKeys);
        // validate recoverer schedules
        trustVaultRequest.request.validateResponse();
        break;
      case "RIPPLE_TRANSACTION_CREATED":
        const { requestId, signData } = webhookMessage.payload;

        trustVaultRequest = {
          requestId,
          request: new RippleTransaction({ requestId, signData }),
        };

        trustVaultRequest.request.validateResponse();

        break;
      case "CARDANO_TRANSACTION_CREATED":
        const transaction = webhookMessage.payload;

        trustVaultRequest = {
          requestId: transaction.requestId,
          request: new CardanoTransaction(transaction),
        };

        trustVaultRequest.request.validateResponse();

        break;
      case "SOLANA_TRANSACTION_CREATED": {
        const solTxn = webhookMessage.payload;
        trustVaultRequest = {
          requestId: solTxn.requestId,
          request: new SolanaTransaction(solTxn),
        };

        trustVaultRequest.request.validateResponse();

        break;
      }
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
   * @see https://developer.bitpandacustody.com/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async replacePublicKeyInDefaultSchedule(
    walletId: string,
    newPublicKey: HexString,
    sign?: SignCallback,
  ): Promise<string> {
    if (!isValidUuid(walletId)) {
      throw new Error("Invalid walletId");
    }
    const newDelegateSchedule = [this.oneOfOneDelegateSchedule(newPublicKey)];
    const validateResult = validateDelegateSchedule(newDelegateSchedule);

    if (!validateResult || validateResult.result === false) {
      throw new Error(`The new delegateSchedule was not validated. Errors ${validateResult.errors}`);
    }

    if (!isValidPublicKey(newPublicKey, NIST_P_256_CURVE)) {
      throw new Error("Invalid publicKey");
    }
    if (sign && typeof sign !== "function") {
      throw new Error("sign callback must be a function");
    }

    const policyRequest = await createChangePolicyRequest(
      walletId,
      newDelegateSchedule,
      this.trustVaultRecoverersPublicKeys,
      this.tvGraphQLClient,
    );
    if (!sign) {
      return policyRequest.requestId;
    }
    return processRequest(policyRequest, sign, this.tvGraphQLClient);
  }

  /**
   * Private API: Use at your own risk
   * Creates a one of one (1 delegate / 1 quorum) delegate policy schedule
   * @param newDelegatePublicKey
   */
  private oneOfOneDelegateSchedule(newDelegatePublicKey: HexString): PolicySchedule {
    return [
      {
        quorumCount: 1,
        keys: [newDelegatePublicKey],
      },
    ];
  }

  /**
   * Creates a request to change a wallet's current delegateSchedule with the 1 of 1 delegate schedule of the passed newPublicKey
   * NOTE:
   * If sign callback is not given, the policy change request will not be signed and will stay
   * in `AWAITING_SIGNATURES` status. (i.e. will not be processed until enough valid signatures are collected)
   * @param {string} walletId - the wallet to change the current delegateSchedule
   * @param {DelegateScheduleArray} newDelegateSchedules - the delegate schedule to be used for this wallet
   * @param {SignCallback} [sign] - signCallback that will be called to sign the computed digest if given
   * @see https://developer.bitpandacustody.com/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async createWalletPolicyChangeRequest(
    walletId: string,
    newDelegateSchedules: DelegateScheduleArray,
    sign?: SignCallback,
  ): Promise<string> {
    if (!isValidUuid(walletId)) {
      throw new Error("Invalid walletId");
    }

    const validateResult = validateDelegateSchedule(newDelegateSchedules);
    if (!validateResult || validateResult.result === false) {
      throw new Error(`The new delegateSchedule was not validated. Errors ${validateResult.errors}`);
    }

    if (sign && typeof sign !== "function") {
      throw new Error("sign callback must be a function");
    }

    const policyRequest = await createChangePolicyRequest(
      walletId,
      newDelegateSchedules,
      this.trustVaultRecoverersPublicKeys,
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
   * @see https://developer.bitpandacustody.com/trust-vault-nodejs-sdk.html#request-statuses
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
   * @param nonce - optional, the integer nonce for this transaction. Use with caution.
   * @param chainId - optional, the integer chainId for this transaction. e.g. 1 = default (mainnet), 56 = Binance Smart Chain
   * @returns {String} requestId - the unique identifier for the request
   * @see https://help.bitpandacustody.com/en/articles/3123653-what-token-s-do-we-support
   * @see https://developer.bitpandacustody.com/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async sendEthereum(
    fromAddress: HexString,
    toAddress: HexString,
    amount: IntString,
    assetSymbol: string | undefined,
    speed: TransactionSpeed = "MEDIUM",
    currency: string,
    sign?: SignCallback,
    gasPrice?: string,
    gasLimit?: string,
    nonce?: Integer,
    chainId?: Integer,
    sendToNetworkWhenSigned: boolean = true,
  ): Promise<string> {
    validateInputs(fromAddress, toAddress, amount, assetSymbol, currency, speed, gasPrice, gasLimit, nonce, sign);

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
      nonce,
      chainId,
      sendToNetworkWhenSigned,
      true,
    );
    if (!sign) {
      return ethTransactionRequest.requestId;
    }
    return processRequest(ethTransactionRequest, sign, this.tvGraphQLClient);
  }

  public async sendRipple(
    destination: HexString,
    amount: IntString,
    subWalletId: string,
    sign?: SignCallback,
  ): Promise<string> {
    const rippleTransaction = await this.tvGraphQLClient.createRippleTransaction(destination, amount, subWalletId);

    if (!sign) {
      return rippleTransaction.requestId;
    }

    return processRequest(
      {
        requestId: rippleTransaction.requestId,
        request: rippleTransaction,
      },
      sign,
      this.tvGraphQLClient,
    );
  }

  /**
   * Create a Cardano payment transaction (ADA only supported)
   * @param destination The address to receive the ADA
   * @param amount The amount in hex (lovelace) to send to destination
   * @param subWalletId  The subWalletId to send the ADA from
   * @returns The requestId for the transaction
   */
  public async sendCardanoPaymentTransaction(
    destination: HexString,
    amount: HexString,
    subWalletId: string,
  ): Promise<string> {
    const cardanoTransaction = await this.tvGraphQLClient.createCardanoPaymentTransaction(
      destination,
      amount,
      subWalletId,
    );
    return cardanoTransaction.requestId;
  }

  /**
   * Create a stake transaction to delegate the stake to a specific pool
   * @param poolId The poolId to delegate the stake too (Bech32 format e.g. pool1nmfr5j5rnqndprtazre802glpc3h865sy50mxdny65kfgf3e5eh)
   * @param subWalletId The subWalletId to stake
   * @returns The requestId for the transaction
   */
  public async sendCardanoStakeTransaction(poolId: string, subWalletId: string): Promise<string> {
    const cardanoTransaction = await this.tvGraphQLClient.createCardanoStakeTransaction(poolId, subWalletId);
    return cardanoTransaction.requestId;
  }

  /**
   * Create an unstake transaction that will unstake the subWallet completely
   * @param subWalletId The subWalletId to unstake from
   * @returns The requestId for the transaction
   */
  public async sendCardanoUnstakeTransaction(subWalletId: string): Promise<string> {
    const cardanoTransaction = await this.tvGraphQLClient.createCardanoUnstakeTransaction(subWalletId);
    return cardanoTransaction.requestId;
  }

  /**
   * Create a withdrawal (of staking rewards) transaction
   * @param subWalletId The subWalletId to withdraw the stake rewards from
   * @returns The requestId for the transaction
   */
  public async sendCardanoWithdrawalTransaction(subWalletId: string): Promise<string> {
    const cardanoTransaction = await this.tvGraphQLClient.createCardanoWithdrawalTransaction(subWalletId);
    return cardanoTransaction.requestId;
  }

  /**
   * Send SOL from your subWallet
   *
   * @param input.subWalletId The subWalletId to send funds from
   * @param input.amount 0x prefixed hex in lamports of the amount you would like to send
   * @param input.to The address which will receive the funds
   * @returns The requestId for the transaction
   */
  public async sendSolanaPaymentTransaction(input: CreateSolanaPaymentTransactionVariables) {
    return this.tvGraphQLClient.createSolanaPaymentTransaction(input);
  }

  /**
   * Send a Solana token transaction from your sub-wallet
   *
   * @param input.subWalletId The subWalletId to send funds from
   * @param input.amount 0x prefixed hex in the lowest denomination of your desired token
   * @param input.to The address which will receive the funds
   * @param input.mintAddress The mint address of the token
   * @returns The requestId for the transaction
   */
  public async sendSolanaTokenPaymentTransaction(input: CreateSolanaTokenPaymentTransactionVariables) {
    return this.tvGraphQLClient.createSolanaTokenPaymentTransaction(input);
  }

  /**
   * Initialise one of your stake addresses on chain
   *
   * @param input.subWalletId The subWalletId which the stake address belongs to
   * @param input.amount 0x prefixed hex of the lamports amount you would like to stake
   * @param input.newStakeAddress The stakeAddress you would like to initialise on chain, must be in status `UNINITIALISED`
   * @param input.voteAddress Optional, if provided, the newStakeAddress will be delegated to this vote account
   * @returns The requestId for the transaction
   */
  public async sendSolanaInitialiseStakeTransaction(input: CreateSolanaInitialiseStakeTransactionVariables) {
    return this.tvGraphQLClient.createSolanaInitialiseStakeTransaction(input);
  }

  /**
   * Activate one of your stake addresses on chain
   *
   * @param input.subWalletId The subWalletId which the stake address belongs to
   * @param input.stakeAddress The stakeAddress you would like to delegate to the vote account, must be in status `ACTIVATING`, `DEACTIVATING` or `INACTIVE`
   * @param input.voteAddress The stakeAddress will be delegated to this vote account
   * @returns The requestId for the transaction
   */
  public async sendSolanaActivateStakeTransaction(input: CreateSolanaActivateStakeTransactionVariables) {
    return this.tvGraphQLClient.createSolanaActivateStakeTransaction(input);
  }

  /**
   * Split some funds from one of your stake addresses to a new stake address
   *
   * @param input.subWalletId The subWalletId which the stake addresses belong to
   * @param input.stakeAddress The stakeAddress which will have funds split from it, must be in status `ACTIVE`
   * @param input.amount 0x prefixed hex of the lamports amount you would like to split
   * @param input.newStakeAddress The stakeAddress you would like to split funds to, must be in status `UNINITIALISED`
   * @returns The requestId for the transaction
   */
  public async sendSolanaSplitStakeTransaction(input: CreateSolanaSplitStakeTransactionVariables) {
    return this.tvGraphQLClient.createSolanaSplitStakeTransaction(input);
  }

  /**
   * Stop your stake address from being delegated
   *
   * @param input.subWalletId The subWalletId which the stake address belongs to
   * @param input.stakeAddress The stakeAddress which you would like to un-delegate, must be in status `ACTIVE` or `ACTIVATING`
   * @returns The requestId for the transaction
   */
  public async sendSolanaDeactivateStakeTransaction(input: CreateSolanaDeactivateStakeTransactionVariables) {
    return this.tvGraphQLClient.createSolanaDeactivateStakeTransaction(input);
  }

  /**
   * Withdraw inactive funds from one of your stake addresses
   *
   * @param input.subWalletId The subWalletId which the stake addresses belong to
   * @param input.stakeAddress The stakeAddress which will have funds withdrawn from it, must be in status `INACTIVE`
   * @param input.amount 0x prefixed hex of the lamports amount you would like to withdraw
   * @param input.withdrawAddress The address that will receive the withdrawn funds
   * @returns The requestId for the transaction
   */
  public async sendSolanaWithdrawStakeTransaction(input: CreateSolanaWithdrawStakeTransactionVariables) {
    return this.tvGraphQLClient.createSolanaWithdrawStakeTransaction(input);
  }

  /**
   * Create a new subWallet inside the given walletId
   * @param {options} CreateSubWalletOptions - the unique identifier for the wallet which the new subWallet will be created inside
   * walletId - The walletId that the new sub-wallet will be created in
   * name - The name of the sub-wallet
   * type - The type of sub-wallet; e.g. ETH, BTC, XDCNETWORK etc
   */
  public async createSubWallet(options: CreateSubWalletOptions): Promise<CreateSubWalletResponse> {
    // validate inputs
    if (
      !options ||
      !options.name ||
      !options.walletId ||
      !isValidUuid(options.walletId) ||
      !SUB_WALLET_TYPES.includes(options.subWalletType as SubWalletType)
    ) {
      throw Error(`You must provide the walletId, name and subWalletType (Supported types: ${SUB_WALLET_TYPES})`);
    }

    // Call the backend to create the sub-wallet
    const createSubWalletUnverifedResponse = await this.tvGraphQLClient.createSubWallet(
      options.walletId,
      options.name,
      options.subWalletType,
    );

    // run some checks on the results
    this.verifyCreateSubWalletResponse(options, createSubWalletUnverifedResponse);

    // if we have got here the address has been verified, so we rename it
    const receiveAddressDetails: ReceiveAddressDetails = {
      path: createSubWalletUnverifedResponse.receiveAddressDetails.path,
      publicKey: createSubWalletUnverifedResponse.receiveAddressDetails.publicKey,
      trustVaultProvenanceSignature:
        createSubWalletUnverifedResponse.receiveAddressDetails.trustVaultProvenanceSignature,
      verifiedAddress: createSubWalletUnverifedResponse.receiveAddressDetails.unverifiedAddress,
    };

    const createSubWalletResponse: CreateSubWalletResponse = {
      subWalletId: createSubWalletUnverifedResponse.subWalletId,
      receiveAddressDetails,
    };

    return createSubWalletResponse;
  }

  private verifyCreateSubWalletResponse(
    options: CreateSubWalletOptions,
    input: CreateSubWalletUnverifiedResponse,
  ): true | Error {
    if (!input.receiveAddressDetails.trustVaultProvenanceSignature) {
      return true;
    }

    const publicKeyProvenanceData: PublicKeyProvenance = {
      path: input.receiveAddressDetails.path,
      unverifiedAddress: input.receiveAddressDetails.unverifiedAddress,
      publicKey: input.receiveAddressDetails.publicKey,
      trustVaultProvenanceSignature: input.receiveAddressDetails.trustVaultProvenanceSignature,
    };

    // verify the publicKey came from TrustVault by using the provenance publicKey
    verifyPublicKey(options.walletId, publicKeyProvenanceData, this.trustVaultPublicKeys);
    const verifiedPublicKey = publicKeyProvenanceData.publicKey;

    // TODO - verify addresses from other chains
    if (options.subWalletType === "ETH") {
      const subWalletAddress = pubToChecksumAddress(verifiedPublicKey);
      if (!subWalletAddress) {
        throw Error(
          `Could not generate a valid ETH sub-wallet address from the verified sub-wallet public key: ${publicKeyProvenanceData.publicKey}`,
        );
      } else {
        if (subWalletAddress?.toLowerCase() !== input.receiveAddressDetails.unverifiedAddress.toLowerCase()) {
          throw Error(
            `Could not verfiy that the ETH sub-wallet address from TrustVault: (${publicKeyProvenanceData.unverifiedAddress}) was dervied from the sub-wallet verified public key: ${publicKeyProvenanceData.publicKey}`,
          );
        }
      }
    }

    return true;
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
   * @see https://developer.bitpandacustody.com/trust-vault-nodejs-sdk.html#request-statuses
   */
  public async cancelRequest(requestId: string, reason?: string): Promise<boolean> {
    if (!isValidUuid(requestId)) {
      throw new Error("Invalid requestId");
    }

    const requestIdResponse: string = await this.tvGraphQLClient.cancelRequest(requestId, reason);
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
