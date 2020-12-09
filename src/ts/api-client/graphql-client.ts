import { InMemoryCache, NormalizedCacheObject } from "apollo-cache-inmemory";
import { ApolloClient } from "apollo-client";
import { createHttpLink } from "apollo-link-http";
import { AUTH_TYPE, createAppSyncLink } from "aws-appsync";
import { config, Credentials } from "aws-sdk";
import * as fs from "fs";
import * as gql from "graphql-tag";
import * as http from "http";
import * as https from "https";
import * as fetch from "node-fetch";

export type AppSyncClient = ApolloClient<NormalizedCacheObject>;

const HTTPS_PROTOCOL = "https:";
const AGENT_ARGS = {
  keepAlive: true,
  keepAliveMsecs: 10_000,
};
const HTTP_AGENT = new http.Agent(AGENT_ARGS);
const HTTPS_AGENT = new https.Agent(AGENT_ARGS);

let packageJson;
try {
  // for in parent dir when built
  packageJson = fs.readFileSync("../package.json", "utf8");
} catch (e) {
  // look in local dir for dev
  packageJson = fs.readFileSync("./package.json", "utf8");
}

const { version } = JSON.parse(packageJson);
// Don't use this as it caused TS to complile a different directory structure
// import { version } from "../../../package.json";

const trustVaultSDKVerson = `TrustVaultSDK/${version}`;

/**
 * Create an ApolloClient that connects to the given AppSync url. By default this method will use IAM security to access
 * the api and the credentials will be those stored in the global AWS config object. The region stored in the global AWS
 * config object will also be used. These default values can be overridden by:
 *
 * @param url The AppSync endpoint to connect to
 * @param apiKeyOrCredentials Set to a string to switch to API_KEY access or a set of credentials to use the non-default
 * credentials with IAM based access
 * @param region Override the default region in the AWS config object
 */
export const createAppSyncClient = (
  timeout = 0,
  url: string,
  apiKeyOrCredentials?: string | Credentials,
  region?: string,
) => {
  let authType = AUTH_TYPE.AWS_IAM;
  let credentials = config.credentials;
  let apiKey: string | Credentials | undefined;

  if (typeof apiKeyOrCredentials === "string") {
    authType = AUTH_TYPE.API_KEY;
    credentials = undefined as any;
    apiKey = apiKeyOrCredentials;
  } else if (typeof apiKeyOrCredentials === "object") {
    credentials = apiKeyOrCredentials;
  }

  const link = createAppSyncLink({
    url,
    region: region || (config.region as string),
    auth: {
      type: authType,
      credentials,
      apiKey,
    } as any,
    complexObjectsCredentials: credentials as any,
    resultsFetcherLink: createHttpLink({
      uri: url,
      fetch: (fetch as any) as GlobalFetch["fetch"],
      fetchOptions: {
        timeout,
        agent: (_parsedURL: URL) => {
          if (_parsedURL.protocol === HTTPS_PROTOCOL) {
            return HTTPS_AGENT;
          } else {
            return HTTP_AGENT;
          }
        },
      },
    }),
  });

  return new ApolloClient({
    cache: new InMemoryCache({
      addTypename: true,
    }),
    link,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "no-cache",
        errorPolicy: "ignore",
      },
      query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
    },
  });
};

export const executeMutation = async <T = any>(client: AppSyncClient, mutation: string, variables?: {}) => {
  return client.mutate<T>({
    context: {
      headers: {
        "x-trust-user-agent": trustVaultSDKVerson,
      },
    },
    mutation: gql.default(mutation),
    variables,
  });
};

export const executeQuery = async <T = any>(client: AppSyncClient, query: string, variables?: {}) =>
  client.query<T>({
    context: {
      headers: {
        "x-trust-user-agent": trustVaultSDKVerson,
      },
    },
    query: gql.default(query),
    variables,
  });
