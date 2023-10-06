import { z } from "zod";
import { slugRegex } from "./utils";

const nonEmptyVarchar = z.string().min(1).max(255);
const nonEmptyText = z.string().min(1);
const positiveInt = z.number().int().positive();

export const retrieveBlogInput = z.object({
  id: z.union([positiveInt, z.string()]).optional(),
  slug: z.string().optional(),
  includePosts: z.boolean().optional(),
});

export type RetrieveBlogInput = z.infer<typeof retrieveBlogInput>;

export const createBlogInput = z.object({
  name: nonEmptyVarchar,
  slug: z.string().regex(slugRegex).max(255),
  posts: z
    .array(
      z.object({
        title: nonEmptyVarchar,
        content: nonEmptyText,
      }),
    )
    .optional(),
});

export type CreateBlogInput = z.infer<typeof createBlogInput>;

export const createPostInput = z.object({
  title: nonEmptyVarchar,
  content: nonEmptyText,
  blogId: positiveInt, // primary keys are unsigned ints
});

export type CreatePostInput = z.infer<typeof createPostInput>;
