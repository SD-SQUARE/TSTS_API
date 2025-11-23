export interface IEditResponse {
  is_edited: boolean;
  errors?: { key: string; message: string }[];
  message: string;
}
