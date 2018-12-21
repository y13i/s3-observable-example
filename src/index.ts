import { S3 } from "aws-sdk";
import { from } from "rxjs";
import { mergeMap, tap, filter, count, map, scan } from "rxjs/operators";

import { listObjectsAsObservable } from "./listObjectsAsObservable";

async function putDummyObjects(
  s3: S3,
  bucket: string,
  prefix: string,
  count: number
) {
  console.log(`putting ${count} dummy objects`);

  for (let i = 0; i < count; i++) {
    const key = `${prefix}${i}-${Date.now()}.json`;
    const value = Math.floor(Math.random() * 100);

    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify({ value })
      })
      .promise();
  }
}

async function deleteAllObjects(
  s3: S3,
  bucket: string,
  prefix: string
): Promise<S3.DeleteObjectsOutput> {
  return await listObjectsAsObservable(s3, {
    Bucket: bucket,
    Prefix: prefix
  })
    .pipe(
      mergeMap(listResult => {
        return s3
          .deleteObjects({
            Bucket: bucket,
            Delete: {
              Objects: listResult.Contents!.map(object => {
                return { Key: object.Key! };
              })
            }
          })
          .promise();
      })
    )
    .toPromise();
}

async function main() {
  if (!process.env["BUCKET"]) {
    throw 'please set ENV["BUCKET"]';
  }

  const bucket: string = process.env["BUCKET"]!;

  if (!process.env["PREFIX"]) {
    throw 'please set ENV["PREFIX"]';
  }

  const prefix: string = process.env["PREFIX"]!.endsWith("/")
    ? process.env["PREFIX"]!
    : `${process.env["PREFIX"]!}/`;

  const s3 = new S3({ logger: process.env["DEBUG"] ? console : undefined });

  await putDummyObjects(s3, bucket, prefix, 130);

  console.log("example 1: simple");
  await listObjectsAsObservable(s3, {
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 50
  })
    .pipe(
      tap(listObjectsResult => {
        console.log(
          `!!! list contains ${listObjectsResult.Contents!.length} items.`
        );
      })
    )
    .toPromise();
  console.log("\n");

  console.log("example 2: transform stream");
  const divisibleBy13Count = await listObjectsAsObservable(s3, {
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 50
  })
    .pipe(
      mergeMap(listObjectsResult => {
        return from(listObjectsResult.Contents!);
      }),

      filter(object => {
        const match = object.Key!.match(/(\d+)\.json$/);
        if (!match) return false;
        const number = parseInt(match[1]!);
        return number % 13 === 0;
      }),

      tap(object => {
        console.log(
          `The timestamp in object key ${object.Key} is divisible by 13`
        );
      }),

      count()
    )
    .toPromise();
  console.log(
    `There are ${divisibleBy13Count} objects with 13-divisible-timestamps.`
  );
  console.log("\n");

  console.log("example 3: another async request and scan");
  await listObjectsAsObservable(s3, {
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 50
  })
    .pipe(
      mergeMap(listObjectsResult => {
        return from(listObjectsResult.Contents!);
      }),

      filter(object => {
        const match = object.Key!.match(/(\d+)\.json$/);
        if (!match) return false;
        const number = parseInt(match[1]!);
        return number % 7 === 0;
      }),

      mergeMap(object => {
        return s3.getObject({ Bucket: bucket, Key: object.Key! }).promise();
      }),

      map(getObjectResult => {
        const parsed: { value: number } = JSON.parse(
          getObjectResult.Body!.toString()
        );

        return parsed.value;
      }),

      scan((acc, x) => {
        return acc + x;
      }, 0),

      tap(currentSum =>
        console.log(
          `The current sum of values in objects with 7-divisible-timestamps is ${currentSum}`
        )
      )
    )
    .toPromise();
  console.log("\n");

  await deleteAllObjects(s3, bucket, prefix);
}

main()
  .then(() => console.log("done"))
  .catch(error => console.log(`error: ${error}`));
