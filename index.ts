import * as functions from '@google-cloud/functions-framework';

functions.http('echo', (req, res) => {
  const contentType = req.header('content-type');
  if (contentType) res.setHeader('content-type', contentType);
  res.status(200).send(req.body);
});
