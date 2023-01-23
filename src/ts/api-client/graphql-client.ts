/* tslint:disable no-submodule-imports */
import {
  ApolloClient,
  ApolloClientOptions,
  ApolloLink,
  gql,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  OperationVariables,
} from "@apollo/client/core";
/* tslint:disable no-submodule-imports */
import { setContext } from "@apollo/client/link/context";
import fetch from "cross-fetch";
import * as http from "http";
import * as https from "https";

const HTTPS_PROTOCOL = "https:";
const AGENT_ARGS = {
  keepAlive: true,
  keepAliveMsecs: 10_000,
};
const HTTP_AGENT = new http.Agent(AGENT_ARGS);
const HTTPS_AGENT = new https.Agent(AGENT_ARGS);

const LOG_NAME = "graphql-client";

export type GraphQLClientType = "ECS" | "BCS" | "TAPI" | "XS" | "AMLS" | "AC" | "RDS" | "XCS" | "BSCS" | string;

export type GraphQlClientOptions = {
  url: string;
  clientName: GraphQLClientType;
  timeout: number;
};

export type GraphQLClientOptionsApiKey = GraphQlClientOptions & {
  apiKey: string;
};

const partialOptions: ApolloClientOptions<NormalizedCacheObject> = {
  cache: new InMemoryCache({ addTypename: false }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    },
    query: {
      fetchPolicy: "no-cache",
      errorPolicy: "all",
    },
  },
};

/**
 * Abstract class for talking to a GraphQL backend. Use the concrete implementations
 */
export abstract class GraphQLClient {
  private clientName: GraphQLClientType = "CLIENT";
  private client: ApolloClient<NormalizedCacheObject>;
  protected url: string;
  protected timeout: number;

  constructor(options: GraphQlClientOptions) {
    if (options.clientName) {
      this.clientName = options.clientName;
    }
    this.url = options.url;
    this.timeout = options.timeout;
    const link = this.getLink();
    const graphqlOptions = { ...partialOptions, link };
    this.client = new ApolloClient<NormalizedCacheObject>(graphqlOptions);
  }

  /**
   * Required by the subclass implementation to return the correct ApolloLink to make connections
   */
  protected abstract getLink(): ApolloLink;

  protected createHttpLink = (url: string, timeout: number = 0) => {
    const httpLink = new HttpLink({
      uri: url,
      fetch: fetch as any,
      fetchOptions: {
        timeout,
        agent: (parsedURL: URL) => {
          if (parsedURL.protocol === HTTPS_PROTOCOL) {
            return HTTPS_AGENT;
          } else {
            return HTTP_AGENT;
          }
        },
      },
    });
    return httpLink;
  };

  /**
   * See README.md
   * execute the query. Throws for:
   * - network errors (400 return codes)
   * - timeouts
   * @param query
   * @returns
   */
  public executeQuery = async <T>(query: string, variables?: OperationVariables) => {
    try {
      return await this.client.query<T>({ query: gql.default(query), variables });
    } catch (e) {
      // Log these error in case the caller doesn't bother
      const errorMessage = this.clientName ?? "";
      console.error(
        `${LOG_NAME}: Calling ${errorMessage}, failed: (${(e as Error).message}) when executing query:\n${query}`,
      );
      console.debug(`${LOG_NAME}: Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
      throw e;
    }
  };

  /**
   * See README.md
   * execute the mutation. Throws for:
   * - network errors (400 return codes)
   * - timeouts
   * - server response errors from the mutation
   * @param query
   * @returns
   */
  public executeMutation = async <T>(mutation: string, variables?: OperationVariables) => {
    try {
      return await this.client.mutate<T>({
        mutation: gql.default(mutation),
        variables,
      });
    } catch (e) {
      // Log these error in case the caller doesn't bother
      const errorMessage = this.clientName ?? "";
      console.error(
        `${LOG_NAME}: Calling ${errorMessage}, failed: (${(e as Error).message}) when executing mutation:\n${mutation}`,
      );
      console.debug(`${LOG_NAME}: Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
      throw e;
    }
  };
}

// link to add start time
const timeStartLink = new ApolloLink((operation, forward) => {
  operation.setContext({ start: new Date().getTime() });
  console.info(`${LOG_NAME}: query: ${operation.query.loc?.source.body}`);
  console.info(`${LOG_NAME}: variables: ${JSON.stringify(operation.variables)}`);
  return forward(operation);
});

// link to compute end time and execution time
const logTimeLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((data) => {
    // data from a previous link
    const dateTime = new Date().getTime();
    const time = dateTime - operation.getContext().start;
    console.info(`${LOG_NAME}: Operation "${operation.operationName}" took ${time}ms to complete`);
    return data;
  });
});

/**
 * Use this class to make an API Key based connection to a GraphQL server
 */
export class GraphQLClientAPIKey extends GraphQLClient {
  private apiKey: string;

  constructor(options: GraphQLClientOptionsApiKey) {
    super(options);
    this.apiKey = options.apiKey;
  }

  protected getLink(): ApolloLink {
    // Set the API Key to the header
    const authLink = setContext((_, { headers }) => {
      // return the headers to the context so httpLink can read them
      const currentHeaders = { ...headers };
      currentHeaders["x-api-key"] = this.apiKey;
      return {
        headers: currentHeaders,
      };
    });

    return ApolloLink.from([timeStartLink, authLink, logTimeLink, this.createHttpLink(this.url, this.timeout)]);
  }
}
