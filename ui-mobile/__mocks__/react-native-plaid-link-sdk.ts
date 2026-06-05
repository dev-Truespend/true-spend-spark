// Jest can't parse this SDK's Fabric components, and tests don't exercise the
// native flow. Provide minimal stubs covering what plaidLinkLauncher imports.

export const create = jest.fn();
export const open = jest.fn();

export type LinkSuccess = {
  publicToken: string;
  metadata: {
    institution?: { id: string; name: string };
    accounts: unknown[];
    linkSessionId: string;
  };
};

export type LinkExit = {
  error?: {
    errorCode: string;
    errorType: string;
    errorMessage: string;
    displayMessage?: string;
  };
  metadata: Record<string, unknown>;
};
