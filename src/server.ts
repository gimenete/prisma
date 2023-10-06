import { Prisma } from "@prisma/client";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { controllers } from "./controllers";
import { env } from "./env";
import { createBlogInput, createPostInput, retrieveBlogInput } from "./inputs";
import { publicProcedure, router } from "./trpc";

const appRouter = router({
  retrieveBlog: publicProcedure.input(retrieveBlogInput).query(async (opts) => {
    const { id, slug, includePosts } = opts.input;
    // Using == here but we could just use !id && !slug, since id and slug can't be 0 or "", and cannot be null by the type system
    if (id == null && slug == null) {
      throw new Error("Bad request: id or slug must be provided");
    }

    return controllers
      .retrieveBlog({
        id,
        slug,
        includePosts,
      })
      .catch(prismaErrorHandler);
  }),

  createBlog: publicProcedure.input(createBlogInput).mutation(async (opts) => {
    const { name, slug, posts } = opts.input;
    return controllers
      .createBlog({
        name,
        slug,
        posts,
      })
      .catch(prismaErrorHandler);
  }),

  createPost: publicProcedure.input(createPostInput).mutation(async (opts) => {
    const { title, content, blogId } = opts.input;
    return controllers
      .createPost({
        title,
        content,
        blogId,
      })
      .catch(prismaErrorHandler);
  }),
});

const server = createHTTPServer({
  router: appRouter,
});

server.listen(env.PORT);

console.log("TRPC server running at port", env.PORT);

export type AppRouter = typeof appRouter;

function prismaErrorHandler(error: any) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      throw new Error(
        `Unique constraint failed: ${
          Array.isArray(target) ? target.join(".") : target
        }`,
      );
    } else if (error.code === "P2025") {
      throw new Error(`Foreign constraint failed: ${error.meta?.cause}`);
    }
  }

  throw error;
}
