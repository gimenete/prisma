import { expect, test } from "vitest";
import { slugRegex } from "./utils";

test("empty slugs are invalid", async () => {
  expect(slugRegex.test("")).toBe(false);
});

test("slugs with no-word characters are invalid", async () => {
  expect(slugRegex.test("!")).toBe(false);
  expect(slugRegex.test("hello!")).toBe(false);
});

test("slugs with whitespaces are invalid", async () => {
  expect(slugRegex.test(" ")).toBe(false);
  expect(slugRegex.test("\n")).toBe(false);
  expect(slugRegex.test("hello world")).toBe(false);
  expect(slugRegex.test("Hello World")).toBe(false);
  expect(slugRegex.test(" hello world")).toBe(false);
  expect(slugRegex.test(" Hello World")).toBe(false);
  expect(slugRegex.test("hello world ")).toBe(false);
  expect(slugRegex.test("Hello World ")).toBe(false);
});

test("valid slugs", async () => {
  expect(slugRegex.test("hello-world")).toBe(true);
  expect(slugRegex.test("Hello-World")).toBe(true);
});
