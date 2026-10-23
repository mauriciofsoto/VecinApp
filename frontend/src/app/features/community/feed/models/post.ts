
export type PostType = 'publicacion' | 'aviso' | 'encuesta';
export type AuthorRole = 'admin' | 'vecino';

export interface PostReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface PostComment {
  id: number;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface Post {
  id: number;
  authorRole: AuthorRole;
  type: PostType;
  
  encuestaId?: number;
  userId: string | number;
  userName: string;
  userAvatar?: string;

  title?: string;
  content: string;
  imageUrl?: string;

  createdAt: string;
  reactions: PostReaction[];
  comments: PostComment[];

  commentsCount: number;
}
