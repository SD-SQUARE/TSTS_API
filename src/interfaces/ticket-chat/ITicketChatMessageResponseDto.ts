export interface ITicketChatMessageResponseDto {
  id: string;
  message: string | null;
  media: {
    id: string;
    fileName: string;
    mime: string | null;
    url: string;
  }[];
  sender: {
    id: string;
    name: string;
    job?: string | null;
    user_type?: string | null;
    image: string | null;
  };
  ticketId: string;
  createdAt: string;
}
