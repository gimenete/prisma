import {
  AttributeValue,
  BatchWriteItemCommand,
  CreateTableCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  WriteRequest,
} from "@aws-sdk/client-dynamodb";
import { CreateBlogInput, CreatePostInput, RetrieveBlogInput } from "../inputs";
import {
  CreateBlogResponse,
  CreatePostResponse,
  RetrieveBlogResponse,
} from "../responses";

const tableName = `one-table-${createId()}`; // This could be defined in an env variable

// TODO: configure using env variables
const dynamo = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:2000",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

// Create table for all entities following the "single table design" pattern https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/
async function createOneTable() {
  await dynamo.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: "pk",
          KeyType: "HASH",
        },
        {
          AttributeName: "sk",
          KeyType: "RANGE",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "sk",
          AttributeType: "S",
        },
        {
          AttributeName: "pk",
          AttributeType: "S",
        },
        {
          AttributeName: "gsi",
          AttributeType: "S",
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      GlobalSecondaryIndexes: [
        {
          IndexName: "gsi",
          KeySchema: [
            {
              AttributeName: "gsi",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
    }),
  );
}

export async function createBlog({
  name,
  slug,
  posts,
}: CreateBlogInput): Promise<CreateBlogResponse> {
  // Check if a blog with the same slug already exists
  const blog = await retrieveBlog({ slug });
  if (blog) throw new Error("A blog with the given slug already exists");

  // Create blog and posts in a transaction using a batch write
  const blogId = createId();

  const items: WriteRequest[] = [
    {
      PutRequest: {
        Item: {
          pk: { S: `blog:${blogId}` },
          sk: { S: `blog:${blogId}` },
          gsi: { S: `blog:${slug}` },
          name: { S: name },
          slug: { S: slug },
        },
      },
    },
  ];

  for (const post of posts || []) {
    items.push({
      PutRequest: {
        Item: {
          pk: { S: `blog:${blogId}:posts` },
          sk: { S: createId() },
          title: { S: post.title },
          content: { S: post.content },
          viewCount: { N: "0" },
        },
      },
    });
  }

  const batchWriteItemCommand = new BatchWriteItemCommand({
    RequestItems: {
      [tableName]: items,
    },
  });

  await dynamo.send(batchWriteItemCommand);

  return {
    id: blogId,
    name,
    slug,
  };
}

export async function createPost({
  title,
  content,
  blogId,
}: CreatePostInput): Promise<CreatePostResponse> {
  // Check if the blog exists
  const blog = await retrieveBlog({ id: blogId });
  if (!blog) throw new Error("A blog with the given id does not exist");

  // Create the post
  const id = createId();
  await dynamo.send(
    new PutItemCommand({
      TableName: tableName,
      Item: {
        pk: { S: `blog:${blogId}:posts` },
        sk: { S: id },
        title: { S: title },
        content: { S: content },
        viewCount: { N: "0" },
      },
    }),
  );

  return {
    id,
    title,
    content,
    viewCount: 0,
    blogId,
  };
}

export async function retrieveBlog({
  id,
  slug,
  includePosts,
}: RetrieveBlogInput): Promise<RetrieveBlogResponse> {
  if (id) {
    const result = await dynamo.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          pk: { S: `blog:${id}` },
          sk: { S: `blog:${id}` },
        },
      }),
    );

    if (!result.Item) return null;
    const blog = result.Item;

    return {
      id,
      name: pick(blog, "name", ""),
      slug: pick(blog, "slug", ""),
      posts: includePosts ? await retrievePosts(String(id)) : undefined,
    };
  }

  const result = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "gsi",
      KeyConditionExpression: "gsi = :value",
      ExpressionAttributeValues: {
        ":value": { S: `blog:${slug}` },
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) return null;

  const [blog] = result.Items;
  const blogId = pick(blog, "pk", "").split(":")[1];

  return {
    id: pick(blog, "pk", "").split(":")[1],
    name: pick(blog, "name", ""),
    slug: pick(blog, "slug", ""),
    posts: includePosts ? await retrievePosts(blogId) : undefined,
  };
}

async function retrievePosts(blogId: string) {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :value",
      ExpressionAttributeValues: {
        ":value": { S: `blog:${blogId}:posts` },
      },
    }),
  );

  if (!result.Items) return [];
  return result.Items.map((item) => {
    return {
      id: pick(item, "sk", ""),
      title: pick(item, "title", ""),
      content: pick(item, "content", ""),
      viewCount: +pick(item, "viewCount", "0"),
      blogId,
    };
  });
}

function createId() {
  return crypto.randomUUID();
}

function pick(
  item: Record<string, AttributeValue>,
  name: string,
  def: string,
): string {
  const value = item[name];
  return value?.S ?? def;
}

async function main() {
  await createOneTable();
  console.log("Created table");

  const blog1 = await createBlog({
    name: "My blog",
    slug: "my-blog",
  });
  console.log("Created blog:", blog1);

  const blog2 = await createBlog({
    name: "My blog 2",
    slug: "my-blog-2",
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
  console.log("Created blog:", blog2);

  const resultBlog1BySlug = await retrieveBlog({ slug: blog1.slug });
  console.log("resultBlog1BySlug:", resultBlog1BySlug);

  const resultBlog2BySlug = await retrieveBlog({ slug: blog2.slug });
  console.log("resultBlog2BySlug:", resultBlog2BySlug);

  const resultBlog1ById = await retrieveBlog({
    id: blog1.id,
    includePosts: true,
  });
  console.log("resultBlog1ById:", resultBlog1ById);

  const resultBlog2ById = await retrieveBlog({
    id: blog2.id,
    includePosts: true,
  });
  console.log("resultBlog2ById:", resultBlog2ById);
}

// Uncomment to manually test the dynamodb implementation
// main()
//   .then(console.log)
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   });
