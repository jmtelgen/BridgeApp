# CloudFront Deployment Guide

This guide explains how to deploy the Bridge Game application to AWS CloudFront with an S3 origin bucket.

## Prerequisites

- AWS CLI configured with appropriate permissions
- S3 bucket for hosting static files
- CloudFront distribution

## Build the Application

```bash
npm run build
```

The built files will be in `dist/TestProject/` directory.

## S3 Bucket Setup

1. **Create S3 Bucket** (if not exists):
   ```bash
   aws s3 mb s3://your-bucket-name
   ```

2. **Configure S3 Bucket for Static Website Hosting**:
   ```bash
   aws s3 website s3://your-bucket-name --index-document index.html --error-document error.html
   ```

3. **Upload Files to S3**:
   ```bash
   aws s3 sync dist/TestProject/ s3://your-bucket-name/ --delete
   ```

4. **Set Bucket Policy** (for public read access):
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "PublicReadGetObject",
               "Effect": "Allow",
               "Principal": "*",
               "Action": "s3:GetObject",
               "Resource": "arn:aws:s3:::your-bucket-name/*"
           }
       ]
   }
   ```

## CloudFront Distribution Setup

1. **Create CloudFront Distribution**:
   - Origin Domain: Your S3 bucket website endpoint
   - Origin Path: Leave empty
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Cache Policy: CachingOptimized (or create custom)

2. **Custom Error Pages**:
   - 404 Error: `/error.html` with 200 response code
   - 403 Error: `/error.html` with 200 response code

3. **Cache Behaviors**:
   - Default (*): Use custom cache policy
   - Assets (`/assets/*`): Longer cache duration (1 year)
   - WASM files: No cache (or short cache)

## Custom Cache Policy (Recommended)

Create a custom cache policy for optimal performance:

```json
{
    "Name": "BridgeGameCachePolicy",
    "Comment": "Cache policy for Bridge Game",
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "MinTTL": 0,
    "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": true,
        "EnableAcceptEncodingBrotli": true,
        "HeadersConfig": {
            "HeaderBehavior": "none"
        },
        "QueryStringsConfig": {
            "QueryStringBehavior": "none"
        },
        "CookiesConfig": {
            "CookieBehavior": "none"
        }
    }
}
```

## Deployment Script

Create a deployment script (`deploy.sh`):

```bash
#!/bin/bash

# Configuration
BUCKET_NAME="your-bucket-name"
DISTRIBUTION_ID="your-cloudfront-distribution-id"

# Build the application
echo "Building application..."
npm run build

# Upload to S3
echo "Uploading to S3..."
aws s3 sync dist/TestProject/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Environment Variables

If you need to configure API endpoints for different environments, create environment-specific builds:

```bash
# Development
VITE_API_BASE_URL=http://localhost:8000 npm run build

# Production
VITE_API_BASE_URL=https://your-api-domain.com npm run build
```

## Security Headers

Add security headers to your CloudFront distribution:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`

## Monitoring

Set up CloudWatch alarms for:
- 4xx error rate
- 5xx error rate
- Cache hit ratio
- Origin latency

## Troubleshooting

1. **CORS Issues**: Ensure your API allows requests from your CloudFront domain
2. **Routing Issues**: Verify the `_redirects` file is uploaded and CloudFront error pages are configured
3. **WASM Loading**: Check that WASM files are served with correct MIME type
4. **Cache Issues**: Use CloudFront invalidation to clear cache when needed

## Cost Optimization

- Use S3 Intelligent Tiering for storage
- Configure appropriate cache policies to reduce origin requests
- Monitor CloudFront usage and adjust cache settings accordingly 