export interface IServiceResponse<T> {
  ok: boolean;
  message: string;
  errors: { key: string; message: string }[];
  data: T;
}
