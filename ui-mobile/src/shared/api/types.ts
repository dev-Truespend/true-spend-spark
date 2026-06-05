export type ClientResponse<T> = {
  success: boolean;
  data: T;
  errors?: string[];
};
