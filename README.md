# s3-observable-example

A small example of making [ListObjectsV2 API](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property) **reactive** with [RxJS](https://rxjs-dev.firebaseapp.com/).

## Usage

```sh
npm install

export BUCKET="yourbucketname" # Don't use any of your important buckets
export PREFIX="test12345"
export DEBUG="true" # If you want to see AWS SDK debug output
npm start
```
