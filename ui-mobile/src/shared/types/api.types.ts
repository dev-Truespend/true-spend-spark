export type ClientResponse<T> = {
  success: boolean;
  data: T | null;
  errors: string[];
};

export type Paged<T> = {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
};
