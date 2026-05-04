import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME, GSI1_INDEX_NAME } from "./dynamo-client";

// --- Key builders ---

export const keys = {
  user: {
    pk: (userId: string) => `USER#${userId}`,
    profile: () => "PROFILE",
    client: (clientId: string) => `CLIENT#${clientId}`,
    invoice: (invoiceId: string) => `INVOICE#${invoiceId}`,
    invoiceCounter: () => "INVOICE_COUNTER",
    token: (tokenJti: string) => `TOKEN#${tokenJti}`,
  },
  gsi1: {
    emailPk: (email: string) => `EMAIL#${email}`,
    emailSk: () => "USER",
    invoiceDatePk: (userId: string) => `USER#${userId}`,
    invoiceDateSk: (issueDate: string) => `INVOICE_DATE#${issueDate}`,
  },
} as const;

// --- Repository ---

export interface DynamoItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  [key: string]: unknown;
}

/**
 * Put an item into the table.
 */
export async function put(item: DynamoItem): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * Put an item only if the PK/SK combination does not already exist.
 * Throws a ConditionalCheckFailedException if the item exists.
 */
export async function putIfNotExists(item: DynamoItem): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );
}

/**
 * Get a single item by PK and SK.
 */
export async function get(
  pk: string,
  sk: string
): Promise<Record<string, unknown> | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );
  return result.Item as Record<string, unknown> | undefined;
}

/**
 * Query items by PK with an optional SK prefix (begins_with).
 */
export async function query(
  pk: string,
  skPrefix?: string
): Promise<Record<string, unknown>[]> {
  const keyCondition = skPrefix
    ? "PK = :pk AND begins_with(SK, :skPrefix)"
    : "PK = :pk";

  const expressionValues: Record<string, unknown> = { ":pk": pk };
  if (skPrefix) {
    expressionValues[":skPrefix"] = skPrefix;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
    })
  );

  return (result.Items as Record<string, unknown>[]) || [];
}

/**
 * Query the GSI1 index by GSI1PK with an optional GSI1SK prefix or exact match.
 */
export async function queryGSI1(
  gsi1pk: string,
  gsi1sk?: string
): Promise<Record<string, unknown>[]> {
  const keyCondition = gsi1sk
    ? "GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk"
    : "GSI1PK = :gsi1pk";

  const expressionValues: Record<string, unknown> = { ":gsi1pk": gsi1pk };
  if (gsi1sk) {
    expressionValues[":gsi1sk"] = gsi1sk;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_INDEX_NAME,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
    })
  );

  return (result.Items as Record<string, unknown>[]) || [];
}

/**
 * Query the GSI1 index with begins_with on GSI1SK, with optional sort order.
 * Useful for querying invoices sorted by date.
 */
export async function queryGSI1WithPrefix(
  gsi1pk: string,
  gsi1skPrefix: string,
  scanIndexForward: boolean = true
): Promise<Record<string, unknown>[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI1_INDEX_NAME,
      KeyConditionExpression:
        "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1skPrefix)",
      ExpressionAttributeValues: {
        ":gsi1pk": gsi1pk,
        ":gsi1skPrefix": gsi1skPrefix,
      },
      ScanIndexForward: scanIndexForward,
    })
  );

  return (result.Items as Record<string, unknown>[]) || [];
}

/**
 * Update specific fields on an item identified by PK and SK.
 * Returns the updated item.
 */
export async function update(
  pk: string,
  sk: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const updateParts: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  let index = 0;
  for (const [field, value] of Object.entries(updates)) {
    const nameAlias = `#field${index}`;
    const valueAlias = `:val${index}`;
    updateParts.push(`${nameAlias} = ${valueAlias}`);
    expressionNames[nameAlias] = field;
    expressionValues[valueAlias] = value;
    index++;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Record<string, unknown>;
}

/**
 * Delete an item by PK and SK.
 */
export async function deleteItem(pk: string, sk: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );
}

/**
 * Atomically increment a numeric field on an item.
 * Creates the item with the field set to 1 if it doesn't exist.
 * Returns the new value of the field.
 */
export async function atomicIncrement(
  pk: string,
  sk: string,
  field: string
): Promise<number> {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: "ADD #field :inc",
      ExpressionAttributeNames: { "#field": field },
      ExpressionAttributeValues: { ":inc": 1 },
      ReturnValues: "ALL_NEW",
    })
  );

  return (result.Attributes as Record<string, number>)[field];
}
