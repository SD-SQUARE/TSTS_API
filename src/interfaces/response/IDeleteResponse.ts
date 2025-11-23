export interface IDeleteResponse {
  is_deleted: boolean;
  errors?: { key: string; message: string }[];
  message: string;
}
