import { create, open, LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";

export class PlaidLinkCancelledError extends Error {
  constructor() {
    super("Plaid Link was cancelled.");
    this.name = "PlaidLinkCancelledError";
  }
}

export class PlaidLinkErrorError extends Error {
  readonly errorCode: string | null;
  readonly displayMessage: string | null;
  constructor(errorCode: string | null, message: string, displayMessage: string | null) {
    super(message);
    this.name = "PlaidLinkErrorError";
    this.errorCode = errorCode;
    this.displayMessage = displayMessage;
  }
}

export type PlaidLinkResult = {
  publicToken: string;
  institutionId: string | null;
  institutionName: string | null;
};

// Launch the native Plaid Link flow with a server-issued link token and resolve
// with the public token the user produced. The caller is responsible for posting
// that public token to /api/v1/plaid/exchange-token.
export function launchPlaidLink(linkToken: string): Promise<PlaidLinkResult> {
  return new Promise((resolve, reject) => {
    create({ token: linkToken, noLoadingState: false });
    open({
      onSuccess: (success: LinkSuccess) => {
        resolve({
          publicToken: success.publicToken,
          institutionId: success.metadata?.institution?.id ?? null,
          institutionName: success.metadata?.institution?.name ?? null
        });
      },
      onExit: (exit: LinkExit) => {
        if (exit.error) {
          reject(
            new PlaidLinkErrorError(
              exit.error.errorCode ?? null,
              exit.error.errorMessage ?? exit.error.displayMessage ?? "Plaid Link failed.",
              exit.error.displayMessage ?? null
            )
          );
          return;
        }
        reject(new PlaidLinkCancelledError());
      }
    });
  });
}
