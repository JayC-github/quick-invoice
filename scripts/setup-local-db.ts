/**
 * Creates the QuickInvoice DynamoDB table in DynamoDB Local.
 *
 * Prerequisites:
 *   docker run -p 8000:8000 amazon/dynamodb-local
 *
 * Usage:
 *   npx tsx scripts/setup-local-db.ts
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:8001";
const TABLE_NAME = process.env.TABLE_NAME || "QuickInvoiceTable";
const REGION = process.env.AWS_REGION || "us-east-1";

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

async function main() {
  // Check if table already exists
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table "${TABLE_NAME}" already exists. Skipping creation.`);
    return;
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name !== "ResourceNotFoundException") {
      throw err;
    }
    // Table doesn't exist — create it
  }

  console.log(`Creating table "${TABLE_NAME}" on ${ENDPOINT}...`);

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
        { AttributeName: "GSI1PK", AttributeType: "S" },
        { AttributeName: "GSI1SK", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1",
          KeySchema: [
            { AttributeName: "GSI1PK", KeyType: "HASH" },
            { AttributeName: "GSI1SK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    })
  );

  console.log(`Table "${TABLE_NAME}" created successfully.`);
}

main().catch((err) => {
  console.error("Failed to set up local database:", err);
  process.exit(1);
});
