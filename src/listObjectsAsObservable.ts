import { Observable } from "rxjs";
import { S3 } from "aws-sdk";

type Request = S3.ListObjectsV2Request;

export function listObjectsAsObservable(
  s3: S3,
  request: Request
): Observable<S3.ListObjectsV2Output> {
  return Observable.create(async (observer: any) => {
    let continuationToken: string | undefined = undefined;

    try {
      do {
        const req: Request = {
          ...request,
          ContinuationToken: continuationToken
        };

        const result = await s3.listObjectsV2(req).promise();

        continuationToken = result.NextContinuationToken;

        observer.next(result);
      } while (continuationToken);
    } catch (error) {
      observer.error(error);
    }

    observer.complete();
  });
}
