import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

let awsCliExecutor = defaultAwsCliExecutor;

function getStorageBackend() {
  if (process.env.NEXUS_STORAGE_BACKEND) {
    return process.env.NEXUS_STORAGE_BACKEND;
  }

  return process.env.NEXUS_DYNAMODB_TABLE ? "dynamodb" : "file";
}

function getDataFile() {
  return process.env.NEXUS_DATA_FILE || path.join(process.cwd(), "data", "users.json");
}

function getDynamoTableName() {
  const tableName = process.env.NEXUS_DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error("NEXUS_DYNAMODB_TABLE must be set when the dynamodb storage backend is enabled.");
  }

  return tableName;
}

function getAwsRegion() {
  return process.env.NEXUS_AWS_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function getAwsCommand() {
  return process.env.NEXUS_AWS_COMMAND || "aws";
}

async function defaultAwsCliExecutor(args) {
  const { stdout } = await execFileAsync(getAwsCommand(), args, {
    maxBuffer: 8 * 1024 * 1024
  });

  const output = String(stdout || "").trim();
  return output ? JSON.parse(output) : {};
}

function buildUserKey(id) {
  return {
    userId: `USER#${id}`,
    recordId: "PROFILE"
  };
}

function buildEmailLookupKey(email) {
  return {
    userId: "LOOKUP#EMAIL",
    recordId: String(email || "").trim().toLowerCase()
  };
}

function buildSessionKey(token) {
  return {
    userId: "SESSION#TOKEN",
    recordId: token
  };
}

function normalizeStoreShape(payload) {
  return {
    users: Array.isArray(payload?.users) ? payload.users : [],
    sessions: Array.isArray(payload?.sessions) ? payload.sessions : []
  };
}

async function ensureStoreFile() {
  const dataFile = getDataFile();

  try {
    await fs.access(dataFile);
  } catch {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify({ users: [], sessions: [] }, null, 2));
  }

  return dataFile;
}

function marshallValue(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return { NULL: true };
  }

  if (typeof value === "string") {
    return { S: value };
  }

  if (typeof value === "number") {
    return { N: String(value) };
  }

  if (typeof value === "boolean") {
    return { BOOL: value };
  }

  if (Array.isArray(value)) {
    return { L: value.map((item) => marshallValue(item)) };
  }

  if (typeof value === "object") {
    return {
      M: Object.fromEntries(
        Object.entries(value)
          .filter(([, nestedValue]) => nestedValue !== undefined)
          .map(([key, nestedValue]) => [key, marshallValue(nestedValue)])
      )
    };
  }

  throw new Error(`Unsupported value type for DynamoDB marshalling: ${typeof value}`);
}

function unmarshallValue(attribute) {
  if (!attribute || typeof attribute !== "object") {
    return undefined;
  }

  if ("S" in attribute) {
    return attribute.S;
  }

  if ("N" in attribute) {
    return Number(attribute.N);
  }

  if ("BOOL" in attribute) {
    return Boolean(attribute.BOOL);
  }

  if ("NULL" in attribute) {
    return null;
  }

  if ("L" in attribute) {
    return attribute.L.map((item) => unmarshallValue(item));
  }

  if ("M" in attribute) {
    return Object.fromEntries(
      Object.entries(attribute.M).map(([key, nestedValue]) => [key, unmarshallValue(nestedValue)])
    );
  }

  return undefined;
}

function marshallItem(item) {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, marshallValue(value)])
  );
}

function unmarshallItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, unmarshallValue(value)]));
}

async function dynamoGetItem(key) {
  const payload = await awsCliExecutor([
    "dynamodb",
    "get-item",
    "--region",
    getAwsRegion(),
    "--table-name",
    getDynamoTableName(),
    "--key",
    JSON.stringify(marshallItem(key)),
    "--consistent-read",
    "--output",
    "json"
  ]);

  return payload?.Item ? unmarshallItem(payload.Item) : null;
}

async function dynamoPutItem(item) {
  await awsCliExecutor([
    "dynamodb",
    "put-item",
    "--region",
    getAwsRegion(),
    "--table-name",
    getDynamoTableName(),
    "--item",
    JSON.stringify(marshallItem(item)),
    "--output",
    "json"
  ]);
}

async function dynamoDeleteItem(key) {
  await awsCliExecutor([
    "dynamodb",
    "delete-item",
    "--region",
    getAwsRegion(),
    "--table-name",
    getDynamoTableName(),
    "--key",
    JSON.stringify(marshallItem(key)),
    "--output",
    "json"
  ]);
}

async function readFileStore() {
  const dataFile = await ensureStoreFile();
  const raw = await fs.readFile(dataFile, "utf8");
  return normalizeStoreShape(JSON.parse(raw));
}

async function writeFileStore(payload) {
  const dataFile = await ensureStoreFile();
  await fs.writeFile(dataFile, JSON.stringify(normalizeStoreShape(payload), null, 2));
}

async function createFileUserRecord(profile, passwordBundle, progress) {
  const payload = await readFileStore();
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    auth: {
      name: profile.name,
      email: profile.email,
      salt: passwordBundle.salt,
      passwordHash: passwordBundle.hash
    },
    profile,
    progress
  };

  payload.users.push(record);
  await writeFileStore(payload);
  return record;
}

async function updateFileUserRecord(record) {
  const payload = await readFileStore();
  const index = payload.users.findIndex((user) => user.id === record.id);

  if (index === -1) {
    throw new Error("User not found");
  }

  payload.users[index] = {
    ...payload.users[index],
    ...record,
    updatedAt: new Date().toISOString()
  };

  await writeFileStore(payload);
  return payload.users[index];
}

async function findFileUserByEmail(email) {
  const payload = await readFileStore();
  return payload.users.find((user) => user.auth.email === String(email || "").trim().toLowerCase()) ?? null;
}

async function findFileUserById(id) {
  const payload = await readFileStore();
  return payload.users.find((user) => user.id === id) ?? null;
}

async function createFileSession(userId, token) {
  const payload = await readFileStore();
  const session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };
  payload.sessions.push(session);
  await writeFileStore(payload);
  return session;
}

async function findFileUserBySessionToken(token) {
  const payload = await readFileStore();
  const session = payload.sessions.find((item) => item.token === token);

  if (!session) {
    return null;
  }

  session.lastUsedAt = new Date().toISOString();
  const user = payload.users.find((candidate) => candidate.id === session.userId) ?? null;
  await writeFileStore(payload);
  return user;
}

async function removeFileSession(token) {
  const payload = await readFileStore();
  payload.sessions = payload.sessions.filter((session) => session.token !== token);
  await writeFileStore(payload);
}

async function createDynamoUserRecord(profile, passwordBundle, progress) {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    auth: {
      name: profile.name,
      email: profile.email,
      salt: passwordBundle.salt,
      passwordHash: passwordBundle.hash
    },
    profile,
    progress
  };

  await dynamoPutItem({
    ...buildUserKey(record.id),
    entityType: "user-profile",
    ...record
  });

  await dynamoPutItem({
    ...buildEmailLookupKey(profile.email),
    entityType: "email-lookup",
    id: record.id,
    email: profile.email,
    updatedAt: now
  });

  return record;
}

async function updateDynamoUserRecord(record) {
  const existing = await findDynamoUserById(record.id);

  if (!existing) {
    throw new Error("User not found");
  }

  const updated = {
    ...existing,
    ...record,
    updatedAt: new Date().toISOString()
  };

  await dynamoPutItem({
    ...buildUserKey(updated.id),
    entityType: "user-profile",
    ...updated
  });

  const previousEmail = existing.auth?.email;
  const nextEmail = updated.auth?.email;

  if (previousEmail && previousEmail !== nextEmail) {
    await dynamoDeleteItem(buildEmailLookupKey(previousEmail));
  }

  if (nextEmail) {
    await dynamoPutItem({
      ...buildEmailLookupKey(nextEmail),
      entityType: "email-lookup",
      id: updated.id,
      email: nextEmail,
      updatedAt: updated.updatedAt
    });
  }

  return updated;
}

async function findDynamoUserByEmail(email) {
  const lookup = await dynamoGetItem(buildEmailLookupKey(email));

  if (!lookup?.id) {
    return null;
  }

  return findDynamoUserById(lookup.id);
}

async function findDynamoUserById(id) {
  const item = await dynamoGetItem(buildUserKey(id));
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    auth: item.auth,
    profile: item.profile,
    progress: item.progress
  };
}

async function createDynamoSession(userId, token) {
  const session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };

  await dynamoPutItem({
    ...buildSessionKey(token),
    entityType: "session",
    ownerUserId: userId,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt
  });

  return session;
}

async function findDynamoUserBySessionToken(token) {
  const session = await dynamoGetItem(buildSessionKey(token));

  if (!session?.ownerUserId) {
    return null;
  }

  const lastUsedAt = new Date().toISOString();
  await dynamoPutItem({
    ...buildSessionKey(token),
    entityType: "session",
    ownerUserId: session.ownerUserId,
    createdAt: session.createdAt,
    lastUsedAt
  });

  return findDynamoUserById(session.ownerUserId);
}

async function removeDynamoSession(token) {
  await dynamoDeleteItem(buildSessionKey(token));
}

export async function readStore() {
  if (getStorageBackend() === "dynamodb") {
    throw new Error("readStore is only supported for the file storage backend.");
  }

  return readFileStore();
}

export async function writeStore(payload) {
  if (getStorageBackend() === "dynamodb") {
    throw new Error("writeStore is only supported for the file storage backend.");
  }

  await writeFileStore(payload);
}

export async function createUserRecord(profile, passwordBundle, progress) {
  if (getStorageBackend() === "dynamodb") {
    return createDynamoUserRecord(profile, passwordBundle, progress);
  }

  return createFileUserRecord(profile, passwordBundle, progress);
}

export async function updateUserRecord(record) {
  if (getStorageBackend() === "dynamodb") {
    return updateDynamoUserRecord(record);
  }

  return updateFileUserRecord(record);
}

export async function findUserByEmail(email) {
  if (getStorageBackend() === "dynamodb") {
    return findDynamoUserByEmail(email);
  }

  return findFileUserByEmail(email);
}

export async function findUserById(id) {
  if (getStorageBackend() === "dynamodb") {
    return findDynamoUserById(id);
  }

  return findFileUserById(id);
}

export async function createSession(userId, token) {
  if (getStorageBackend() === "dynamodb") {
    return createDynamoSession(userId, token);
  }

  return createFileSession(userId, token);
}

export async function findUserBySessionToken(token) {
  if (getStorageBackend() === "dynamodb") {
    return findDynamoUserBySessionToken(token);
  }

  return findFileUserBySessionToken(token);
}

export async function removeSession(token) {
  if (getStorageBackend() === "dynamodb") {
    return removeDynamoSession(token);
  }

  return removeFileSession(token);
}

export function configureStorageForTests(options = {}) {
  if (options.awsCliExecutor) {
    awsCliExecutor = options.awsCliExecutor;
  }
}

export function resetStorageForTests() {
  awsCliExecutor = defaultAwsCliExecutor;
}
