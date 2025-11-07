const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET;

const s3 = new S3Client({ region, credentials: region ? undefined : undefined });

async function generatePresignedPut(key, contentType='application/octet-stream', expiresSeconds = 900) {
  if (!bucket) throw new Error('S3_BUCKET not configured');
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresSeconds });
  return url;
}

module.exports = { generatePresignedPut };
