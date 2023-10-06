import { env } from "../env";
import { CreateBlogInput, CreatePostInput, RetrieveBlogInput } from "../inputs";
import {
  CreateBlogResponse,
  CreatePostResponse,
  RetrieveBlogResponse,
} from "../responses";
import * as prisma from "./prisma";
import * as dynamo from "./dynamo";

// This could also be an interface and each implementation could be a class
// implementing the interface
type Controllers = {
  createBlog({
    name,
    slug,
    posts,
  }: CreateBlogInput): Promise<CreateBlogResponse>;

  createPost({
    title,
    content,
    blogId,
  }: CreatePostInput): Promise<CreatePostResponse>;

  retrieveBlog({
    id,
    slug,
    includePosts,
  }: RetrieveBlogInput): Promise<RetrieveBlogResponse>;
};

export const controllers: Controllers = env.DATABASE_URL.startsWith("mysql://")
  ? prisma
  : dynamo;
