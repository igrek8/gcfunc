# gcfunc

Call Google Cloud functions locally in a better way.

## Usage

```
Usage: gcfunc invoke [options]

Options:
  -f, --function <name>  function name
  -p, --project <path>   path to package.json or index file (default: "/app/gcfunc")
  -d, --data <data>      use -d '{ "method": "POST", "body": "Hello World!" }'
                         use -d @file to load CommonJS with module.exports
                         use -d @file to load ESM module with default export
  -e, --env-file <path>  path to env file
  -h, --help             display help for command
```

```bash
npx gcfunc -f "my-function" -d '{ "method": "POST", "body": "Hello World!" }'
npx gcfunc -f "my-function" -d @my-request.js # CommonJS with module.exports = {}
npx gcfunc -f "my-function" -d @my-request.mjs # ESM with default export {}
```

## Dynamic Data

Construct [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) to pass into [`Fetch API`](https://developer.mozilla.org/en-US/docs/Web/API/fetch).

```js
// CommonJS
module.exports = {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'Hello Serverless!',
};
```

```js
// ESM
export default {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: 'Hello Serverless!',
};
```

## TypeScript

```bash
ts-node node_modules/.bin/gcfunc -f "my-function" -d '{ "method": "POST", "body": "Hello World!" }'
ts-node node_modules/.bin/gcfunc -f "my-function" -d @my-request.js # CommonJS with module.exports = {}
ts-node node_modules/.bin/gcfunc -f "my-function" -d @my-request.mjs # ESM with default export {}
```
