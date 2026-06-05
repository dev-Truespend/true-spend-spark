export type CurrencyOption = {
  code: string;
  displayName: string;
  symbol: string;
};

export type CurrenciesResponse = {
  currencies: CurrencyOption[];
};

export type PermissionStateOption = {
  code: string;
  displayName: string;
};

export type PermissionStatesResponse = {
  permissionStates: PermissionStateOption[];
};
