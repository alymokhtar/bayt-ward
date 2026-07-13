const { v2: cloudinary } = require('cloudinary');
const { getCloudinaryCloudName, getCloudinaryApiKey, getCloudinaryApiSecret, getCloudinaryUploadFolder } = require('./src/lib/env');

cloudinary.config({
  cloud_name: getCloudinaryCloudName(),
  api_key: getCloudinaryApiKey(),
  api_secret: getCloudinaryApiSecret(),
  secure: true,
});

console.log('time', new Date().toISOString());
console.log('cloudName', getCloudinaryCloudName(), 'apiKeyPrefix', getCloudinaryApiKey().slice(0, 4), 'hasSecret', Boolean(getCloudinaryApiSecret()));

cloudinary.api.ping()
  .then((r) => {
    console.log('ping', r);
    return cloudinary.uploader.upload(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=',
      {
        folder: getCloudinaryUploadFolder(),
        resource_type: 'image',
        overwrite: true,
        tags: ['debug-upload'],
      }
    );
  })
  .then((r) => {
    console.log('upload ok', r);
  })
  .catch((e) => {
    console.error('upload err', JSON.stringify({
      message: e.message,
      name: e.name,
      ...(e.http_code ? { http_code: e.http_code } : {}),
      ...(e.request_id ? { request_id: e.request_id } : {}),
      ...(e.path ? { path: e.path } : {}),
      stack: e.stack,
    }, null, 2));
    process.exit(1);
  });
