import { program } from 'commander';

import * as functions from '@google-cloud/functions-framework';
import * as assert from 'assert';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';

type Loader = typeof import('@google-cloud/functions-framework/build/src/loader');

type Server = typeof import('@google-cloud/functions-framework/build/src/server');

const FRAMEWORK_DIR = path.dirname(require.resolve('@google-cloud/functions-framework'));

const packageJSONPath = path.join(__dirname, '..', 'package.json');
const packageJSONContent = fs.readFileSync(packageJSONPath, { encoding: 'utf-8' });
const packageJSON = JSON.parse(packageJSONContent);
assert(packageJSON.version);
const version = packageJSON.version;

interface Options {
  function: string;
  project: string;
  data?: Promise<RequestInit>;
  envFile?: string;
}

program
  .name('gcfunc')
  .description('CLI to simplify development with Google Cloud Functions')
  .version(version)
  .command('invoke')
  .requiredOption('-f, --function <name>', 'function name')
  .requiredOption('-p, --project <path>', 'path to package.json or index file', process.cwd())
  .option(
    '-d, --data <data>',
    [
      'use -d \'{ "method": "POST", "body": "Hello World!" }\' ',
      'use -d @file to load CommonJS with module.exports',
      'use -d @file to load ESM module with default export',
    ].join('\n'),
    async (data) => {
      if (data.startsWith('@')) {
        try {
          const mod = await import(path.resolve(data.slice(1)));
          return mod?.default ?? mod;
        } catch (error) {
          assert(error instanceof Error);
          const description = error.message?.split('\n')?.[0]?.toLowerCase();
          throw `error: failed to load config, ${description}`;
        }
      }
      try {
        return JSON.parse(data);
      } catch (error) {
        assert(error instanceof Error);
        const description = error.message?.split('\n')?.[0]?.toLowerCase();
        throw `error: failed to parse json, ${description}`;
      }
    }
  )
  .option('-e, --env-file <path>', 'path to env file', (path) => dotenv.config({ path }))
  .action(async (options: Options) => {
    const config = await options.data;
    const { getUserFunction }: Loader = await import(path.join(FRAMEWORK_DIR, 'loader'));
    const { getServer }: Server = await import(path.join(FRAMEWORK_DIR, 'server'));
    const fn = await getUserFunction(path.resolve(options.project), options.function, 'http');
    assert(fn);
    const server = getServer(fn.userFunction, fn.signatureType);

    server.once('error', (error) => {
      console.error(error);
      process.exitCode = 1;
    });

    server.once('request', (_, res: functions.Response) => {
      let body: unknown;
      const json = res.json;
      const send = res.send;

      res.json = function (body1) {
        body ??= body1;
        res.json = json;
        return res.json(body1);
      };

      res.send = function (body2) {
        body ??= body2;
        res.send = send;
        return res.send(body2);
      };

      res.once('finish', () => {
        const status = res.statusCode;
        const headers = res.getHeaders();
        const channel = status < 400 ? 'info' : 'error';
        const log = { status, headers, body: body instanceof stream.Readable ? '[Readable]' : body };
        console[channel](JSON.stringify(log));
        process.exitCode = status < 400 ? 0 : 1;
        process.exit();
      });
    });

    server.once('listening', async () => {
      const addr = server.address();
      assert(addr && typeof addr === 'object');
      await fetch(`http://127.0.0.1:${addr.port}`, { method: 'POST', ...config });
    });

    server.setTimeout(0);
    server.listen();
  })
  .parseAsync();
