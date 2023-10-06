import { PrismaClient } from "@prisma/client";
import { CreateBlogInput, CreatePostInput, RetrieveBlogInput } from "../inputs";
import { CreateBlogResponse, CreatePostResponse } from "../responses";

export const prisma = new PrismaClient();

export async function createBlog({
  name,
  slug,
  posts,
}: CreateBlogInput): Promise<CreateBlogResponse> {
  return prisma.blog.create({
    data: {
      name,
      slug,
      posts: {
        create: posts,
      },
    },
  });
}

export async function createPost({
  title,
  content,
  blogId,
}: CreatePostInput): Promise<CreatePostResponse> {
  return prisma.post.create({
    data: {
      title,
      content,
      blog: {
        connect: {
          id: blogId,
        },
      },
    },
  });
}

export async function retrieveBlog({
  id,
  slug,
  includePosts,
}: RetrieveBlogInput) {
  return prisma.blog.findUnique({
    where: {
      id: id ? +id : undefined,
      slug,
    },
    include: includePosts
      ? {
          posts: {
            orderBy: {
              id: "desc",
            },
            take: 100,
          },
        }
      : undefined,
  });
}
