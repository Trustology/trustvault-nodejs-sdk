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
  // CreateRippleTransactionGraphQlResponse,
  CreateRippleTransactionVariables,
  CreateSubWalletGraphQlResponse,
  CreateSubWalletUnverifiedResponse,
  CreateSubWalletVariables,
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
  SubWalletType,
  TransactionSpeed,
  TrustVaultGraphQLClientOptions,
} from "../types";
import { GraphQLClientAPIKey, GraphQLClientOptionsApiKey } from "./graphql-client";

/* Private API. Use at your own risk, liable to change */
export class TrustVaultGraphQLClient {
  private graphQLClient: GraphQLClientAPIKey;

  constructor({ apiKey, url, timeout }: TrustVaultGraphQLClientOptions) {
    const options: GraphQLClientOptionsApiKey = {
      clientName: "TrustAPI",
      apiKey,
      url,
      timeout,
    };
    this.graphQLClient = new GraphQLClientAPIKey(options);
  }

  /**
   * Create a request to change the delegate of the given walletId's policy
   * @param walletId
   * @param newDelegatePublicKey
   */
  public async createChangePolicyRequest(
    walletId: string,
    newDelegateSchedules: PolicySchedule[],
  ): Promise<CreateChangePolicyRequestResponse> {
    const { query, variables } = this.createChangePolicyRequestMutation(walletId, newDelegateSchedules);

    const result = await this.graphQLClient.executeMutation<CreateChangePolicyGraphQlResponse>(query, variables);
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

    const result = await this.graphQLClient.executeMutation<CreateBitcoinTransactionGraphQlResponse>(query, variables);
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
   * @param chainId - optional, the integer chainId for this transaction. e.g. 1 = default (mainnet), 56 = Binance Smart Chain
   * @see https://help.bitpandacustody.com/en/articles/3123653-what-token-s-do-we-support
   */
  public async createEthereumTransaction(
    fromAddress: HexString,
    toAddress: HexString,
    amount: IntString,
    assetSymbol: string | undefined,
    speed: TransactionSpeed = "MEDIUM",
    currency: string = "GBP",
    gasPrice?: string,
    gasLimit?: string,
    nonce?: Integer,
    chainId?: Integer,
    sendToNetworkWhenSigned: boolean = true,
    sendToDevicesForSigning: boolean = true,
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
      chainId,
      sendToNetworkWhenSigned,
      sendToDevicesForSigning,
    );

    const result = await this.graphQLClient.executeMutation<CreateEthereumTransactionGraphQlResponse>(query, variables);

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
   * TODO
   */
  public async createRippleTransaction(
    destination: HexString,
    amount: IntString,
    subWalletId: string,
  ): Promise<any> {
    const { query, variables } = this.createRippleTransactionMutation(destination, amount, subWalletId);

    const result = await this.graphQLClient.executeMutation<any>(query, variables);
    console.log(`result: ${JSON.stringify(result)}`);

    if (
      !result.data?.createRippleTransaction.requestId
    ) {
      throw new Error(
        `Unable to create bitcoin transaction. If the issue persists, please contact support. ${JSON.stringify(
          result,
        )}`,
      );
    }

    return result.data.createRippleTransaction;
  }

  /**
   * Private API: Use at your own risk
   * Create a new sub-wallet
   */
  public async createSubWallet(
    walletId: string,
    name: string,
    subWalletType: SubWalletType,
  ): Promise<CreateSubWalletUnverifiedResponse> {
    const { query, variables } = this.createSubWalletMutation(walletId, name, subWalletType);

    const result = await this.graphQLClient.executeMutation<CreateSubWalletGraphQlResponse>(query, variables);

    if (!result.data) {
      throw new Error(`Unable to create subWallet: ${JSON.stringify(result)}`);
    }

    const createSubwalletResponse = result.data?.createSubWallet;

    if (
      createSubwalletResponse &&
      createSubwalletResponse.subWalletId &&
      createSubwalletResponse.receiveAddressDetails
    ) {
      const response: CreateSubWalletUnverifiedResponse = {
        subWalletId: createSubwalletResponse?.subWalletId,
        receiveAddressDetails: createSubwalletResponse?.receiveAddressDetails,
      };
      return response;
    }
    throw new Error(`Unable to create new subwallet: ${JSON.stringify(createSubwalletResponse)}`);
  }

  /**
   * Private API: Use at your own risk
   * Create a new bitcoin receive address for the given subWalletId
   * @param subWalletId
   */
  public async createBitcoinReceiveAddress(subWalletId: string): Promise<string> {
    const { query, variables } = this.createBitcoinAddressMutation(subWalletId);

    const result = await this.graphQLClient.executeMutation<CreateBitcoinAddressGraphQlResponse>(query, variables);
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

    const result = await this.graphQLClient.executeQuery<GetSubWalletsGraphQlResponse>(query);
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

    const result = await this.graphQLClient.executeQuery<GetSubWalletsGraphQlResponse>(query, variables);
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

      const result = await this.graphQLClient.executeQuery<GetSubWalletGraphQlResponse>(query, variables);
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

    const result = await this.graphQLClient.executeMutation<AddSignatureGraphQlResponse>(query, addSignaturePayload);
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

    const result = await this.graphQLClient.executeQuery<GetRequestGraphQlResponse>(query, variables);
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
  public async cancelRequest(requestId: string, reason?: string): Promise<string> {
    const { query, variables } = this.cancelRequestMutation(requestId, reason);

    const result = await this.graphQLClient.executeQuery<CancelRequestGraphQlResponse>(query, variables);
    if (!result.data?.cancelRequest.requestId) {
      throw new Error(`Unable to cancel request: ${JSON.stringify(result)}`);
    }

    return result.data.cancelRequest.requestId;
  }

  // Helpers

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
    delegateSchedules: PolicySchedule[],
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
      delegateSchedules,
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
    assetSymbol: string | undefined,
    speed: TransactionSpeed = "MEDIUM",
    gasPrice?: IntString,
    gasLimit?: IntString,
    currency: string = "GBP",
    nonce?: Integer,
    chainId?: Integer,
    sendToNetworkWhenSigned: boolean = true,
    sendToDevicesForSigning: boolean = true,
  ): GraphQlQueryVariable<CreateEthereumTransactionVariables> {
    const mutation = `
      mutation (
          $from: String!
          $to: String!
          $value: String!
          $assetSymbol: String
          $speed: TransactionSpeed
          $currency: String
          $sendToNetworkWhenSigned: Boolean
          $sendToDevicesForSigning: Boolean
          $gasLimit: String
          $gasPrice: String
          $nonce: Int
          $chainId: Int
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
              chainId: $chainId
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
      chainId,
    };

    return {
      query: mutation,
      variables: createEthereumTransactionVariables,
    };
  }


  private createRippleTransactionMutation(
    destination: HexString,
    amount: IntString,
    subWalletId: string,
  ): GraphQlQueryVariable<CreateRippleTransactionVariables> {
    // sendToDevicesForSigning: true, source: "TAPI", 
    const mutation = `
    mutation MyMutation(
      $destination: String!,
      $amount: String!,
      $subWalletId: String!
    ) {
      createRippleTransaction(createRippleTransactionInput: {sendToDevicesForSigning: true, subWalletId: $subWalletId, rippleTransactionInput: {amount: $amount, destination: $destination}}) {
        requestId
        signData {
          shaSignData
          signData
          transactionDigest
        }
      }
    }
    `;

    const createRippleTransactionVariables: CreateRippleTransactionVariables = {
      destination,
      amount,
      subWalletId,
    };

    return {
      query: mutation,
      variables: createRippleTransactionVariables,
    };
  }

  /**
   * Private API: Use at your own risk
   * createSubWalletMutation graphQL query
   * @param walletId - the id of the wallet to create the sub-wallet inside
   * @param name - the name of the sub-wallet
   * @parm subWalletType - The type of sub-wallet to create, e.g. which chain (ETH, BTC etc)
   */
  private createSubWalletMutation(
    walletId: string,
    name: string,
    subWalletType: SubWalletType,
  ): GraphQlQueryVariable<CreateSubWalletVariables> {
    const mutation = `
        mutation(
          $type: SubWalletType!, 
          $name: String!, 
          $walletId: String!
        ) {
          createSubWallet(
            createSubWalletInput: {
                type: $type,
                name: $name,
                walletId: $walletId,
            }
          ) {
            subWalletId
            receiveAddressDetails{
              addressType
              path
              publicKey
              trustVaultProvenanceSignature
              unverifiedAddress
            }
          }
        }
    `;
    const createSubWalletVariable: CreateSubWalletVariables = {
      walletId,
      name,
      type: subWalletType,
    };

    return {
      query: mutation,
      variables: createSubWalletVariable,
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
        rawTransactionBytes
        signatures {
          der
          raw
        }
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
   * @param reason optionally pass the reason for cancelling
   */
  private cancelRequestMutation(requestId: string, reason?: string): GraphQlQueryVariable<GetRequestVariables> {
    const mutation = `mutation($requestId: String!, $reason: String) {
      cancelRequest(requestId: $requestId, reason: $reason) {
        requestId
      }
    }`;
    const cancelRequestVariables: CancelRequestVariables = { requestId, reason };

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
