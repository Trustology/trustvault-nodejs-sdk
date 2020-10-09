/**
 * Retrieves the walletId of the subWalletId
 * @param subWalletId
 */
export const getWalletIdFromSubWalletId = (subWalletId: string): string => {
  const [walletId] = subWalletId.split("/");
  return walletId;
};
