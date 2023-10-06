type Post = {
  id: number | string;
  title: string;
  content: string;
  viewCount: number;
  blogId: number | string;
};

export type CreateBlogResponse = {
  id: number | string;
  name: string;
  slug: string;
};

export type CreatePostResponse = Post;

export type RetrieveBlogResponse = {
  id: number | string;
  name: string;
  slug: string;
  posts?: Post[];
} | null;
