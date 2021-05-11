import {
  AddSignatureGraphQlResponse,
  AddSignaturePayload,
  AddSignatureVariables,
  BitcoinAddressType,
  BitcoinAddressUsageType,
  CancelRequestGraphQlResponse,
  CancelRequestVariables,
  CreateBitcoinAddressGraphQlResponse,
  CreateBitcoinAddressVariables,
  CreateBitcoinTransactionGraphQlResponse,
  CreateBitcoinTransactionIdResponse,
  CreateBitcoinTransactionVariables,
  CreateChangePolicyGraphQlResponse,
  CreateChangePolicyRequestResponse,
  CreateChangePolicyVariables,
  CreateEthereumTransactionGraphQlResponse,
  CreateEthereumTransactionResponse,
  CreateEthereumTransactionVariables,
  GetRequestGraphQlResponse,
  GetRequestVariables,
  GetSubWalletGraphQlResponse,
  GetSubWalletOptions,
  GetSubWalletsConnectionVariables,
  GetSubWalletsGraphQlResponse,
  GetSubWalletsOptions,
  GetSubWalletVariables,
  GraphQlQueryVariable,
  HdWalletPath,
  HdWalletPathObj,
  HexString,
  Integer,
  IntString,
  PolicySchedule,
  RequestItem,
  ResultConnection,
  SubWallet,
  TransactionSpeed,
  TrustVaultGraphQLClientOptions,
} from "../types";
import { AppSyncClient, createAppSyncClient, executeMutation, executeQuery } from "./graphql-client";

/* Private API. Use at your own risk, liable to change */
export class TrustVaultGraphQLClient {
  private clientWithAPIKeyAuthorization: AppSyncClient;

  constructor({ apiKey, url, timeout }: TrustVaultGraphQLClientOptions) {
    this.clientWithAPIKeyAuthorization = createAppSyncClient(timeout, url, apiKey);
  }

  /**
   * Create a request to change the delegate of the given walletId's policy
   * @param walletId
   * @param newDelegatePublicKey
   */
  public async createChangePolicyRequest(
    walletId: string,
    newDelegatePublicKey: HexString,
  ): Promise<CreateChangePolicyRequestResponse> {
    const { query, variables } = this.createChangePolicyRequestMutation(walletId, newDelegatePublicKey);

    const result = await executeMutation<CreateChangePolicyGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );
    if (!result.data) {
      throw new Error(`Unable to create authorisation request: ${JSON.stringify(result)}`);
    }

    return result.data.createChangePolicyRequest.requests[0];
  }

  /**
   * Private API: Use at your own risk
   * Create a request to send a bitcoin transaction
   * @param subWalletId
   * @param toAddress
   * @param amount - satoshi
   * @param speed
   */
  public async createBitcoinTransaction(
    subWalletId: string,
    toAddress: string,
    amount: IntString,
    speed: TransactionSpeed = "MEDIUM",
  ): Promise<CreateBitcoinTransactionIdResponse> {
    const { query, variables } = this.createBitcoinTransactionMutation(subWalletId, toAddress, amount, speed);

    const result = await executeMutation<CreateBitcoinTransactionGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );
    if (
      !result.data?.createBitcoinTransaction.signData?.transaction ||
      !result.data?.createBitcoinTransaction.requestId
    ) {
      throw new Error(
        `Unable to create bitcoin transaction. If the issue persists, please contact support. ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.data.createBitcoinTransaction;
  }

  /**
   * Private API: Use at your own risk
   * Create a request to send an ethereum transaction
   * @param fromAddress - the address to send the ethereum transaction from (0x prefixed hex string)
   * @param toAddress - the recipient address of the ethereum transaction (0x prefixed hex string)
   * @param amount - amount in smallest denominator unit of the asset (i.e. wei in ETH)
   * @param assetSymbol - see below for the supported ETH asset symbols
   * @param speed - optional, the speed of the transaction (defaults to 'MEDIUM')
   * @param currency - optional, the currency you want the transaction value to be converted to for verification (defaults to 'GBP)
   *                   "GBP" | "USD" | "EUR" | "AED" | "CHF" | "CNY" | "JPY" + supported tokens
   * @param gasPrice - optional, the gasPrice to set for the transaction, decimal integer string in WEI
   * @param gasLimit - optional, the gasLimit to set for the transaction, decimal integer string
   * @param nonce - optional, the nonce for this transaction. Use with caution.
   * @see https://help.trustology.io/en/articles/3123653-what-token-s-do-we-support
   */
  public async createEthereumTransaction(
    fromAddress: HexString,
    toAddress: HexString,
    amount: IntString,
    assetSymbol: string,
    speed: TransactionSpeed = "MEDIUM",
    currency: string = "GBP",
    gasPrice?: string,
    gasLimit?: string,
    nonce?: Integer,
  ): Promise<CreateEthereumTransactionResponse> {
    const { query, variables } = this.createEthereumTransactionMutation(
      fromAddress,
      toAddress,
      amount,
      assetSymbol,
      speed,
      gasPrice,
      gasLimit,
      currency,
      nonce,
    );

    const result = await executeMutation<CreateEthereumTransactionGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );

    const createEthereumTransactionResponse = result.data?.createEthereumTransaction;
    const signData = createEthereumTransactionResponse?.signData;
    if (!signData || !createEthereumTransactionResponse?.requestId) {
      throw new Error(
        `Unable to create ethereum transaction. If the issue persists, please contact support. ${JSON.stringify(
          result,
        )}`,
      );
    }

    const response: CreateEthereumTransactionResponse = {
      ...createEthereumTransactionResponse,
      signData: {
        ...signData,
        hdWalletPath: this.hdWalletPathObjToArray(signData.hdWalletPath),
      },
    };

    return response;
  }

  /**
   * Private API: Use at your own risk
   * Create a new bitcoin receive address for the given subWalletId
   * @param subWalletId
   */
  public async createBitcoinReceiveAddress(subWalletId: string): Promise<string> {
    const { query, variables } = this.createBitcoinAddressMutation(subWalletId);

    const result = await executeMutation<CreateBitcoinAddressGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );
    if (!result.data) {
      throw new Error(`Unable to create bitcoin address: ${JSON.stringify(result)}`);
    }

    return result.data.createBitcoinAddress.address.id;
  }

  /**
   * Private API: Use at your own risk
   * Retrieve the list of subWallets available
   */
  public async getSubWallets(includeBalances?: boolean): Promise<SubWallet[]> {
    const { query } = this.getSubWalletsQuery(includeBalances);

    const result = await executeQuery<GetSubWalletsGraphQlResponse>(this.clientWithAPIKeyAuthorization, query);
    if (!result.data) {
      throw new Error(`Unable to get sub-wallets: ${JSON.stringify(result)}`);
    }

    return result.data.user.subWallets.items;
  }

  /**
   * Private API: Use at your own risk
   * Retrieve the list of subWallets available
   */
  public async getSubWalletsConnection(options: GetSubWalletsOptions): Promise<ResultConnection<SubWallet[]>> {
    const { limit, nextToken, includeBalances } = options;
    const { query, variables } = this.getSubWalletsQuery(includeBalances, limit, nextToken);

    const result = await executeQuery<GetSubWalletsGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );
    if (!result.data) {
      throw new Error(`Unable to get sub-wallets: ${JSON.stringify(result)}`);
    }

    return {
      items: result.data.user.subWallets.items,
      nextToken: result.data.user.subWallets.nextToken,
      errors: result.errors,
    };
  }

  /**
   * Private API: Use at your own risk
   * Retrieve a Single subWallets
   */
  public async getSubWallet(subWalletId: string, options: GetSubWalletOptions): Promise<SubWallet> {
    const { includeBalances } = options;
    if (subWalletId) {
      const { query, variables } = this.getSubWalletQuery(subWalletId, includeBalances);

      const result = await executeQuery<GetSubWalletGraphQlResponse>(
        this.clientWithAPIKeyAuthorization,
        query,
        variables,
      );
      if (!result.data) {
        throw new Error(`Unable to get sub-wallet for ${subWalletId}: ${JSON.stringify(result)}`);
      }
      return result.data.user.subWallet;
    } else {
      throw new Error(`You must pass a subWalletId`);
    }
  }

  /**
   * Private API: Use at your own risk
   * Add a signature to the given requestId
   * @param addSignaturePayload
   */
  public async addSignature(addSignaturePayload: AddSignaturePayload): Promise<string> {
    const { query } = this.addSignatureMutation(addSignaturePayload);

    const result = await executeMutation<AddSignatureGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      addSignaturePayload,
    );
    if (!result.data) {
      throw new Error(
        `Unable to add signature to requestId ${addSignaturePayload.requestId}: ${JSON.stringify(result)}`,
      );
    }

    return result.data.addSignature.requestId;
  }

  /**
   * Private API: Use at your own risk
   * Retrieves the request for the given requestId
   * @param requestId
   */
  public async getRequest(requestId: string): Promise<RequestItem> {
    const { query, variables } = this.getRequestQuery(requestId);

    const result = await executeQuery<GetRequestGraphQlResponse>(this.clientWithAPIKeyAuthorization, query, variables);
    if (!result.data) {
      throw new Error(`Unable to get request: ${JSON.stringify(result)}`);
    }

    return result.data.getRequest;
  }

  /**
   * Private API: Use at your own risk
   * Cancels the request for the given requestId
   * @param requestId
   */
  public async cancelRequest(requestId: string): Promise<string> {
    const { query, variables } = this.cancelRequestMutation(requestId);

    const result = await executeQuery<CancelRequestGraphQlResponse>(
      this.clientWithAPIKeyAuthorization,
      query,
      variables,
    );
    if (!result.data?.cancelRequest.requestId) {
      throw new Error(`Unable to cancel request: ${JSON.stringify(result)}`);
    }

    return result.data.cancelRequest.requestId;
  }

  // Helpers

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
   * Private API: Use at your own risk
   * Converts the a hdWalletPath object to a hdWalletPath array format
   * @param hdWalletPathObj
   */
  private hdWalletPathObjToArray(hdWalletPathObj: HdWalletPathObj): HdWalletPath {
    const { hdWalletPurpose, hdWalletCoinType, hdWalletAccount, hdWalletUsage, hdWalletAddressIndex } = hdWalletPathObj;
    return [hdWalletPurpose, hdWalletCoinType, hdWalletAccount, hdWalletUsage, hdWalletAddressIndex];
  }

  // Mutation/Query methods

  /**
   * Private API: Use at your own risk
   * addSignatureMutation graphQL query
   * @param addSignaturePayload
   */
  private addSignatureMutation(addSignaturePayload: AddSignaturePayload): GraphQlQueryVariable<AddSignaturePayload> {
    const mutation = `
      mutation(
        $requestId: String!
        $signRequests: [SignRequest!]!
      ) {
        addSignature(
          addSignatureInput: {
            requestId: $requestId
            signRequests: $signRequests
          }
        ) {
          requestId
        }
      }
    `;
    const addSignatureVariables: AddSignatureVariables = addSignaturePayload;

    return {
      query: mutation,
      variables: addSignatureVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * createChangePolicyRequestMutation graphQL query
   * @param walletId
   * @param newDelegatePublicKey
   */
  private createChangePolicyRequestMutation(
    walletId: string,
    newDelegatePublicKey: HexString,
  ): GraphQlQueryVariable<CreateChangePolicyVariables> {
    const mutation = `
      mutation($walletId: String!, $delegateSchedules: [[ScheduleInput!]!]!) {
        createChangePolicyRequest(
          createChangePolicyRequestInput: {
            walletId: $walletId
            delegateSchedules: $delegateSchedules
          }
        ) {
          requests {
            walletId
            requestId
            recovererTrustVaultSignature
            unverifiedDigestData{
              shaSignData
              signData
            }
            policyTemplate {
              expiryTimestamp
              delegateSchedules {
                keys
                quorumCount
              }
              recovererSchedules {
                keys
                quorumCount
              }
            }
          }
        }
      }
    `;
    const createChangePolicyVariables: CreateChangePolicyVariables = {
      walletId,
      delegateSchedules: [this.oneOfOneDelegateSchedule(newDelegatePublicKey)],
    };

    return {
      query: mutation,
      variables: createChangePolicyVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * getSubWalletsQuery graphQL query with balances
   */
  private getSubWalletQuery(subWalletId: string, includeBalances?: boolean): GraphQlQueryVariable {
    const query = `
      query getSubWallet($subWalletId: String!) {
        user {
          subWallet(subWalletId: $subWalletId) {
            name
            id
            subWalletId
            createdAt
            address
            updatedAt
            ${
              includeBalances
                ? `
                balances {
                  items {
                    asset {
                      symbol
                      displaySymbol
                      name
                      type
                      chain
                      decimalPlace
                    }
                    amount {
                      value
                      currency
                      timestamp
                    }
                  }
                }`
                : ``
            }
          }
        }
      }
    `;
    const getSubWalletVariables: GetSubWalletVariables = {
      subWalletId,
    };

    return {
      query,
      variables: getSubWalletVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * getSubWalletsQuery graphQL query
   */
  private getSubWalletsQuery(includeBalances?: boolean, limit?: number, nextToken?: string): GraphQlQueryVariable {
    const variables: GetSubWalletsConnectionVariables = {
      limit: limit ? limit : 10,
      nextToken: nextToken ? nextToken : null,
    };

    const query = `
      query getSubWallets($limit: Int, $nextToken: String) {
        user {
          subWallets(limit: $limit, nextToken: $nextToken) {
            items {
              address
              name
              subWalletId
              createdAt
              updatedAt
              ... on BlockchainSubWallet {
                chain
                publicKey
                trustVaultPublicKeySignature
                __typename
              }
              ${
                includeBalances
                  ? `
              balances {
                items {
                  asset {
                    symbol
                    displaySymbol
                    name
                    type
                    chain
                    decimalPlace
                  }
                  amount {
                    value
                    currency
                    timestamp
                  }
                }
              }`
                  : ``
              }
            }
            nextToken
          }
        }
      }
    `;
    return {
      query,
      variables,
    };
  }

  /**
   * Private API: Use at your own risk
   * createBitcoinTransactionMutation graphQL query
   * @param subWalletId
   * @param toAddress
   * @param {IntString} amount - satoshi
   * @param speed - defaults to MEDIUM
   * @param sendToDevicesForSigning
   * @param sendToNetworkWhenSigned
   */
  private createBitcoinTransactionMutation(
    subWalletId: string,
    to: string,
    value: IntString,
    speed: TransactionSpeed = "MEDIUM",
    sendToDevicesForSigning: boolean = true,
    sendToNetworkWhenSigned: boolean = true,
  ): GraphQlQueryVariable<CreateBitcoinTransactionVariables> {
    const mutation = `
      mutation createBitcoinTransaction (
        $to: String!
        $subWalletId: String!
        $value: String!
        $speed: TransactionSpeed
        $sendToNetworkWhenSigned: Boolean
        $sendToDevicesForSigning: Boolean
      ) {
        createBitcoinTransaction(
          createBitcoinTransactionInput: {
            bitcoinTransactionParams: {
              subWalletId: $subWalletId
              to: $to
              amount: {
                value: $value
                currency: "SATOSHI"
              }
              speed: $speed
            }
            source: "API"
            sendToNetworkWhenSigned: $sendToNetworkWhenSigned
            sendToDevicesForSigning: $sendToDevicesForSigning
          }
        ) {
          fee
          maxAllowedToSend
          feeForMax
          chainRate
          balance
          signData {
            transaction {
              version
              inputs {
                address
                txId
                outputIndex
                script
                sequence
                value
                publicKeyProvenanceData {
                  ...publicKeyProvenance
                }
                unverifiedDigestData{
                  transactionDigest
                  shaSignData
                  signData
                }
              }
              outputs {
                recipientAddress
                amountToSend
                publicKeyProvenanceData {
                  ...publicKeyProvenance
                }
              }
              lockTime
              sighash
            }
          }
          ... on CreateBitcoinTransactionIdResponse {
            requestId
          }
        }
      }

      fragment publicKeyProvenance on BitcoinPublicKeyProvenance {
        publicKey
        path
        trustVaultProvenanceSignature
        unverifiedAddress
        addressType
        __typename
      }
    `;

    const createBitcoinTransactionVariables: CreateBitcoinTransactionVariables = {
      to,
      subWalletId,
      value,
      speed,
      sendToNetworkWhenSigned,
      sendToDevicesForSigning,
    };

    return {
      query: mutation,
      variables: createBitcoinTransactionVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * createEthereumTransactionMutation graphQL query
   * @param fromAddress - the address to send the ethereum transaction from (0x prefixed hex string)
   * @param toAddress - the recipient address of the ethereum transaction (0x prefixed hex string)
   * @param amount - amount in smallest denominator unit of the asset (i.e. wei in ETH)
   * @param assetSymbol - see below for the supported ETH asset symbols
   * @param speed - optional, the speed of the transaction (defaults to 'MEDIUM')
   * @param gasPrice - optional, the gasPrice to set for the transaction
   * @param gasLimit - optional, the gasLimit to set for the transaction
   * @param currency - optional, the currency you want the transaction value to be converted to for verification (defaults to 'GBP)
   *                   "GBP" | "USD" | "EUR" | "AED" | "CHF" | "CNY" | "JPY" + supported tokens (see below)
   */
  private createEthereumTransactionMutation(
    from: HexString,
    to: HexString,
    value: IntString,
    assetSymbol: string,
    speed: TransactionSpeed = "MEDIUM",
    gasPrice?: IntString,
    gasLimit?: IntString,
    currency: string = "GBP",
    nonce?: Integer,
    sendToDevicesForSigning: boolean = true,
    sendToNetworkWhenSigned: boolean = true,
  ): GraphQlQueryVariable<CreateEthereumTransactionVariables> {
    const mutation = `
      mutation (
          $from: String!
          $to: String!
          $value: String!
          $assetSymbol: String!
          $speed: TransactionSpeed
          $currency: String
          $sendToNetworkWhenSigned: Boolean
          $sendToDevicesForSigning: Boolean
          $gasLimit: String
          $gasPrice: String
          $nonce: Int
      ) {
        createEthereumTransaction(
          createTransactionInput: {
            ethereumTransaction: {
              assetSymbol: $assetSymbol
              fromAddress: $from
              to: $to
              value: $value
              speed: $speed
              gasLimit: $gasLimit
              gasPrice: $gasPrice
              nonce: $nonce
            }
            source: "API"
            currency: $currency
            sendToNetworkWhenSigned: $sendToNetworkWhenSigned
            sendToDevicesForSigning: $sendToDevicesForSigning
          }
        ) {
          ... on CreateEthereumTransactionResponse {
            requestId
          }
          signData {
            transaction {
              to
              fromAddress
              value
              gasPrice
              gasLimit
              nonce
              chainId
              data
            }
            hdWalletPath {
              hdWalletPurpose
              hdWalletCoinType
              hdWalletAccount
              hdWalletUsage
              hdWalletAddressIndex
            }
            unverifiedDigestData {
              transactionDigest
              signData
              shaSignData
            }
          }
          assetRate
          chainRate
        }
      }
    `;

    const createEthereumTransactionVariables: CreateEthereumTransactionVariables = {
      from,
      to,
      value,
      assetSymbol,
      speed,
      gasLimit,
      gasPrice,
      currency,
      nonce,
      sendToNetworkWhenSigned,
      sendToDevicesForSigning,
    };

    return {
      query: mutation,
      variables: createEthereumTransactionVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * getRequestQuery graphQL query
   * @param requestId
   */
  private getRequestQuery(requestId: string): GraphQlQueryVariable<GetRequestVariables> {
    const query = `query($requestId: String!) {
      getRequest(requestId: $requestId) {
        requestId
        status
        type
        transactionHash
      }
    }`;
    const getRequestVariables: GetRequestVariables = { requestId };

    return {
      query,
      variables: getRequestVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * cancelRequestMutation graphQL query
   * @param requestId
   */
  private cancelRequestMutation(requestId: string): GraphQlQueryVariable<GetRequestVariables> {
    const mutation = `mutation($requestId: String!) {
      cancelRequest(requestId: $requestId) {
        requestId
      }
    }`;
    const cancelRequestVariables: CancelRequestVariables = { requestId };

    return {
      query: mutation,
      variables: cancelRequestVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * createBitcoinAddressMutation graphQL query
   * @param subWalletId
   * @param addressType
   * @param addressUsageType
   */
  private createBitcoinAddressMutation(
    subWalletId: string,
    addressType: BitcoinAddressType = "COMPATIBILITY",
    addressUsageType: BitcoinAddressUsageType = "RECEIVE",
  ): GraphQlQueryVariable<CreateBitcoinAddressVariables> {
    const mutation = `
      mutation createBitcoinAddress(
        $subWalletId: String!
        $addressType: BitcoinAddressType
        $addressUsageType: BitcoinAddressUsage
      ) {
        createBitcoinAddress(
          createBitcoinAddressInput: {
            subWalletIdString: $subWalletId
            addressType: $addressType
            addressUsageType: $addressUsageType
          }
        ) {
          address {
            id
            ... on BitcoinAddress {
              addressType
              addressUsageType
            }
          }
        }
      }
    `;

    const createBitcoinAddressVariables: CreateBitcoinAddressVariables = {
      subWalletId,
      addressType,
      addressUsageType,
    };

    return {
      query: mutation,
      variables: createBitcoinAddressVariables,
    };
  }
}
