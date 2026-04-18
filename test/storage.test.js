import test from "node:test";
import assert from "node:assert/strict";
import {
  configureStorageForTests,
  createSession,
  createUserRecord,
  findUserByEmail,
  findUserBySessionToken,
  removeSession,
  resetStorageForTests,
  updateUserRecord
} from "../lib/storage.js";

function getFlagValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function buildMockAwsCli() {
  const items = new Map();

  return async function mockAwsCli(args) {
    const operation = args[1];
    const tableName = getFlagValue(args, "--table-name");

    if (!tableName) {
      throw new Error("Missing --table-name in AWS CLI mock.");
    }

    if (operation === "put-item") {
      const item = JSON.parse(getFlagValue(args, "--item"));
      const key = `${tableName}:${item.userId.S}:${item.recordId.S}`;
      items.set(key, item);
      return {};
    }

    if (operation === "get-item") {
      const keyPayload = JSON.parse(getFlagValue(args, "--key"));
      const key = `${tableName}:${keyPayload.userId.S}:${keyPayload.recordId.S}`;
      const item = items.get(key);
      return item ? { Item: item } : {};
    }

    if (operation === "delete-item") {
      const keyPayload = JSON.parse(getFlagValue(args, "--key"));
      const key = `${tableName}:${keyPayload.userId.S}:${keyPayload.recordId.S}`;
      items.delete(key);
      return {};
    }

    throw new Error(`Unsupported mocked AWS CLI operation: ${operation}`);
  };
}

test("dynamodb storage backend persists users and sessions via lookup records", async () => {
  const previousBackend = process.env.NEXUS_STORAGE_BACKEND;
  const previousTable = process.env.NEXUS_DYNAMODB_TABLE;
  const previousRegion = process.env.AWS_REGION;

  process.env.NEXUS_STORAGE_BACKEND = "dynamodb";
  process.env.NEXUS_DYNAMODB_TABLE = "codesprout-academy-staging-auth";
  process.env.AWS_REGION = "us-east-1";
  configureStorageForTests({ awsCliExecutor: buildMockAwsCli() });

  try {
    const user = await createUserRecord(
      {
        name: "Persisted Learner",
        email: "persist@example.com",
        primaryLanguage: { id: "python", label: "Python" }
      },
      {
        salt: "salt-value",
        hash: "hash-value"
      },
      {
        savedLessons: [],
        savedProjects: [],
        missionHistory: []
      }
    );

    assert.ok(user.id);

    const loadedByEmail = await findUserByEmail("persist@example.com");
    assert.equal(loadedByEmail?.auth?.email, "persist@example.com");

    await createSession(user.id, "token-123");
    const sessionUser = await findUserBySessionToken("token-123");
    assert.equal(sessionUser?.id, user.id);

    sessionUser.progress.savedLessons.push({ topic: "Python loops" });
    const updated = await updateUserRecord(sessionUser);
    assert.equal(updated.progress.savedLessons.length, 1);

    const afterUpdate = await findUserByEmail("persist@example.com");
    assert.equal(afterUpdate?.progress?.savedLessons?.length, 1);

    await removeSession("token-123");
    const afterLogout = await findUserBySessionToken("token-123");
    assert.equal(afterLogout, null);
  } finally {
    resetStorageForTests();

    if (previousBackend === undefined) {
      delete process.env.NEXUS_STORAGE_BACKEND;
    } else {
      process.env.NEXUS_STORAGE_BACKEND = previousBackend;
    }

    if (previousTable === undefined) {
      delete process.env.NEXUS_DYNAMODB_TABLE;
    } else {
      process.env.NEXUS_DYNAMODB_TABLE = previousTable;
    }

    if (previousRegion === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = previousRegion;
    }
  }
});
