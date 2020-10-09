declare type GlobalFetch = WindowOrWorkerGlobalScope;
// tslint:disable:no-empty-interface
// Fix missing type declaration in redux-offline
declare module "@redux-offline/redux-offline/lib/types" {
  interface NetInfo {}

  interface NetworkCallback {}
}

declare module "asn1.js";
