import { expect, test } from "vitest";
import { client } from "./client";
import { TRPCClientError } from "@trpc/client";
import { prisma } from "./controllers/prisma";

test("creates a blog with no posts", async () => {
  const name = "My blog";
  const slug = `slug-${Date.now()}`;

  const result = await client.createBlog.mutate({ name, slug });

  expect(result).toMatchObject({
    id: expect.any(Number),
    name,
    slug,
  });

  const blog = await prisma.blog.findUnique({ where: { id: +result.id } });
  expect(blog).toMatchObject({
    id: result.id,
    name,
    slug,
  });
});

test("creates a blog with posts", async () => {
  const name = "My blog";
  const slug = `slug-${Date.now()}`;

  const result = await client.createBlog.mutate({
    name,
    slug,
    posts: [
      {
        title: "My first post",
        content: "Hello world",
      },
      {
        title: "My second post",
        content: "Hello world",
      },
    ],
  });

  expect(result).toMatchObject({
    id: expect.any(Number),
    name,
    slug,
  });

  const blog = await prisma.blog.findUnique({ where: { id: +result.id } });
  expect(blog).toMatchObject({
    id: result.id,
    name,
    slug,
  });

  const posts = await prisma.post.findMany({ where: { blogId: +result.id } });
  expect(posts).toMatchObject([
    {
      title: "My first post",
      content: "Hello world",
    },
    {
      title: "My second post",
      content: "Hello world",
    },
  ]);
});

test("fails to create a blog if the slug is invalid", async () => {
  await expect(() =>
    client.createBlog.mutate({
      name: "My blog",
      slug: "",
    }),
  ).rejects.toThrowError(TRPCClientError);
});

test("creates a post", async () => {
  const blog = await prisma.blog.create({
    data: {
      name: "My blog",
      slug: `slug-${Date.now()}`,
    },
  });

  const result = await client.createPost.mutate({
    title: "My first post",
    content: "Hello world",
    blogId: blog.id,
  });

  expect(result).toMatchObject({
    id: expect.any(Number),
    title: "My first post",
    content: "Hello world",
    blogId: blog.id,
  });
});

test("fails to create a post if the blog does not exist", async () => {
  await expect(() =>
    client.createPost.mutate({
      title: "My first post",
      content: "Hello world",
      blogId: Number.MAX_SAFE_INTEGER,
    }),
  ).rejects.toThrow("Foreign constraint failed");
});

test.each([[false], [true]])(
  "retrieves a blog by id including posts: %s",
  async (includePosts) => {
    const name = "My blog";
    const slug = `slug-${Date.now()}`;

    const blog = await prisma.blog.create({
      data: {
        name,
        slug,
      },
    });

    if (includePosts) {
      await prisma.post.createMany({
        data: [
          {
            title: "My first post",
            content: "Hello world",
            blogId: blog.id,
          },
          {
            title: "My second post",
            content: "Hello world",
            blogId: blog.id,
          },
        ],
      });
    }

    const result = await client.retrieveBlog.query({
      id: blog.id,
      includePosts,
    });

    expect(result).toMatchObject({
      id: blog.id,
      name,
      slug,
      ...(includePosts
        ? {
            posts: [
              {
                title: "My second post",
                content: "Hello world",
                blogId: blog.id,
              },
              {
                title: "My first post",
                content: "Hello world",
                blogId: blog.id,
              },
            ],
          }
        : {}),
    });
  },
);

test.each([[false], [true]])(
  "retrieves a blog by slug including posts: %s",
  async (includePosts) => {
    const name = "My blog";
    const slug = `slug-${Date.now()}`;

    const blog = await prisma.blog.create({
      data: {
        name,
        slug,
      },
    });

    if (includePosts) {
      await prisma.post.createMany({
        data: [
          {
            title: "My first post",
            content: "Hello world",
            blogId: blog.id,
          },
          {
            title: "My second post",
            content: "Hello world",
            blogId: blog.id,
          },
        ],
      });
    }

    const result = await client.retrieveBlog.query({ slug, includePosts });

    expect(result).toMatchObject({
      id: blog.id,
      name,
      slug,
      ...(includePosts
        ? {
            posts: [
              {
                title: "My second post",
                content: "Hello world",
                blogId: blog.id,
              },
              {
                title: "My first post",
                content: "Hello world",
                blogId: blog.id,
              },
            ],
          }
        : {}),
    });
  },
);

test("fails to retrieve a blog if neither id nor slug, are provided", async () => {
  await expect(() => client.retrieveBlog.query({})).rejects.toThrow(
    "Bad request: id or slug must be provided",
  );
});

test("null is returned if the blog id does not exist", async () => {
  const result = await client.retrieveBlog.query({
    id: Number.MAX_SAFE_INTEGER,
  });
  expect(result).toBeNull();
});

test("null is returned if the blog slug does not exist", async () => {
  const result = await client.retrieveBlog.query({ slug: "does-not-exist" });
  expect(result).toBeNull();
});
