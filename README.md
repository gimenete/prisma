# Prisma take home exercise

## Running the project

Install dependencies:

```bash
npm i
```

Create an `.env` file like this:

```env
DATABASE_URL="mysql://root@localhost/prisma_take_home_test"
PORT=8080
```

The `PORT` is optional and it defaults to `8080`.

Run migrations:

```bash
npx prisma migrate deploy
```

Run in dev mode

```bash
npm run dev
```

## Building and running in production mode

Build:

```bash
npm run build
```

Start the server:

```bash
npm runs start
```

## Running tests

Tests assume the service is running. Then just run:

```bash
npm t
```

## Questions

### What were some of the reasons you chose the technology stack that you did?

I've chosen a relational database (MySQL), Prisma and TypeScript because those are the most convinient technologies to me to build something that needs to persist data into a database. They give me full type safety and fast iteration loops. I've chosen MySQL because I'm familiar with it and because unlike other databases such as PostgreSQL, it automatically indexes foreign keys, which makes things a little easier.

For the microservice transport layer I've chosen tRPC because it's ideal when using TypeScript: it allows to create a fully typed API over HTTP and it's easier to consume and test than GraphQL. For example it supports advanced type validation using zod, so it not only checks if something is a string, but it allows checking if an argument passes a regular expression check or has a minimum or maximum length.

### What were some of the trade-offs you made when building this application? Why were these acceptable trade-offs?

tRPC is not the best solution if you are consuming the microservice from a programming language other than TypeScript. In an scenario where that's a problem I'd have chosen gRPC or Twirp. However I chose tRPC because it's simpler to implement if we can restrict the solution to TypeScript.

If we knew that we were going to only use Prisma, another nice option could've been GraphQL implemented with Pothos because it has a Prisma plugin that makes it easier to build GraphQL APIs given a Prisma schema, and additionally solves N+1 problems without additional efforts.

### Given more time, what improvements or optimizations would you want to add?

I've only implemented the basic endpoints from the exercise description. If I had more time I'd add other endpoints such as for retrieving posts by some criteria, sorting, adding pagination (specifically cusor-based pagination), authorization, etc.

It'd also be interesting to have the ability to search using a full-text index, have the ability to add tags or categories to posts, add timestamps (`createdAt` / `updatedAt`), have the ability to specify one or more authors to each post, make use of the `viewCount` column, etc.

Additionally, the dynamodb implementation lacks testing.

Finally, it'd be useful to do some load testing, to make sure how far we can go with the current implementation.

### When would you add them?

Authorization is something fundamental before putting the microservice in production, so I'd do that immediately. While adding new functionality or more use cases would be something to do only when the consumer of the microservice requires it.

### What would you need to do to make this application scale to hundreds of thousands of users?

I think it would scale pretty well already, but there's a few things we could do to make it scale even more.

1. We could configure database replicas and for those endpoints that only retrieve data we could connect to the replica instead of the primary database.
2. We can scale the microservice horizontally, deploying it several times and using a load balancer.
3. Only if the previous improvements are not enough, we could add a caching mechanism for queries.

Right now the database is configured to delete posts in cascade when a blog is deleted. In a real world scenario we would mark the blog as deleted with a `deletedAt` timestamp, filter out results with a non-null `deletedAt` timestamp (including blogs and their posts), and we would do the deletion in a background job. The reason is that deleting lots of rows at once could generate a spike of writes to the database that could affect the service.

- How would you change the architecture to allow for models that are stored in different databases? E.g. posts are stored in Cassandra and blogs are stored in Postgres.

For the bonus task I've fully implemented a version that uses Prisma, and I've also implemented almost completely another version that works with DynamoDB. What I've done is creating clear interfaces ("inputs" and "responses") and two different implementations. If we wanted to implement a hybrid approach we would just implement a new "controllers" implementation with the same interfaces.

One thing we'll need to have in mind is that having multiple databases can potentially change the behavior of one of the requirements: having the ability of creating a blog and several posts at the same time atomically. If posts and blogs are stored in different databases we'll need to handle the case in which persisting the blog model succeeds but persisting the posts fail.

## Notes

I've decided to have autoincrement ids in all tables even though the blog entity already has a unique column. I've made it this way for a few reasons:

- The `slug` is something that can eventually change. It's probably super uncommon, but data that is provided by the user and/or human-readable is always potentially required to change at some point.
- Integers take less space, so when referencing a blog, the foreign keys will be smaller, and when adding indexes to the blog table those will be more efficient too. So in general we are saving space in the file system and memory even though we are adding a new column.
- Integers can be sorted, and an autoincremental column give us the ability to additionally sort by creation date without having to index a potentially new `createdAt` column.

However when I started implementing the dynamodb implementation I had to use non-numeric and non-sequential ids. That's why inputs and responses allow using numbers but also strings as ids. I chose random UUIDs (v4) but for keeping the ability to sort cronologically we could use UUIDv7 https://www.ietf.org/archive/id/draft-ietf-uuidrev-rfc4122bis-11.html#name-uuid-version-7
