import { Observable } from "rxjs";
import { S3 } from "aws-sdk";

type Request = S3.ListObjectsV2Request;

export function listObjectsAsObservable(
  s3: S3,
  request: Request
): Observable<S3.ListObjectsV2Output> {
  return Observable.create((observer: any) => {
    let finished = false;
    let continuationToken: string | undefined = undefined;

    (async () => {
      try {
        do {
          const req: Request = {
            ...request,
            ContinuationToken: continuationToken
          };

          const result = await s3.listObjectsV2(req).promise();

          continuationToken = result.NextContinuationToken;

          observer.next(result);
        } while (continuationToken && !finished);
      } catch (error) {
        observer.error(error);
      }

      observer.complete();
    })();

    return () => (finished = true);
  });
}
