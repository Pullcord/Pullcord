import { StrKey } from "@stellar/stellar-sdk";

export const isContractId = (s) => typeof s === "string" && StrKey.isValidContract(s);
export const isAccountId = (s) => typeof s === "string" && StrKey.isValidEd25519PublicKey(s);
