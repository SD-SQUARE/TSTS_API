export interface ICreateResponse {
  is_added: boolean;
  errors?: { key: string; message: string }[];
  message: string;
}
