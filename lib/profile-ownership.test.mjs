import test from "node:test";
import assert from "node:assert/strict";
import { isOwnProfile } from "./profile-ownership.ts";

test("treats the base profile route as the active user's own profile", () => {
  assert.equal(isOwnProfile(undefined, "alice"), true);
});

test("treats a matching profile username as the active user's own profile", () => {
  assert.equal(isOwnProfile("alice", "alice"), true);
});

test("treats a different profile username as someone else's profile", () => {
  assert.equal(isOwnProfile("alice", "bob"), false);
});

test("does not treat a named profile as owned when there is no active user", () => {
  assert.equal(isOwnProfile("alice", null), false);
});
