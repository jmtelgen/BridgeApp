#!/bin/bash

# Configuration - Update these values
BUCKET_NAME="nextlevelbridgeassetdistributionbucket"
DISTRIBUTION_ID="E1HX0HXMLYUF2Z"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Bridge Game deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if bucket name is configured
if [ "$BUCKET_NAME" = "your-bucket-name" ]; then
    echo -e "${RED}❌ Please update BUCKET_NAME in deploy.sh${NC}"
    exit 1
fi

# Build the application
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Upload to S3
echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
aws s3 sync dist/TestProject/ s3://$BUCKET_NAME/ --delete

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ S3 upload failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"

# Invalidate CloudFront cache (if distribution ID is provided)
if [ "$DISTRIBUTION_ID" != "your-cloudfront-distribution-id" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ CloudFront cache invalidation initiated${NC}"
    else
        echo -e "${YELLOW}⚠️  CloudFront cache invalidation failed, but deployment completed${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping CloudFront invalidation (DISTRIBUTION_ID not configured)${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${YELLOW}📝 Don't forget to:${NC}"
echo -e "   - Configure your CloudFront distribution"
echo -e "   - Set up custom error pages"
echo -e "   - Configure cache policies"
echo -e "   - Set up monitoring and alerts" 