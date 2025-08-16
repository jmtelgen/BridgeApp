# Bridge Game

A modern, real-time Bridge card game built with React, TypeScript, and Vite. This application allows players to join game rooms and play Bridge together in a web browser.

## 🎮 Features

- **Real-time Gameplay**: Multiplayer Bridge game with live updates
- **Room Management**: Create and join game rooms with unique IDs
- **User Management**: Automatic user ID generation and persistence
- **AI/Robot Players**: Built-in AI for bidding and playing
- **Serverless Backend**: Powered by AWS Lambda and DynamoDB
- **Modern UI**: Built with React, Tailwind CSS, and Radix UI components
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Type Safety**: Full TypeScript support for better development experience

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Styling**: Tailwind CSS, Bootstrap, Radix UI
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Build Tool**: Nx (Monorepo management)
- **Deployment**: AWS S3 + CloudFront (Frontend), AWS Lambda (Backend)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **AWS CLI** (for deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BridgeGame
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Configuration

This project is configured to run without Nx Cloud (offline mode). If you encounter any Nx Cloud connection errors, the configuration is already set to disable cloud features.

### 4. Start Development Server

```bash
npm start
# or
npx nx serve TestProject
```

The application will be available at `http://localhost:4200`

### 5. Build for Production

```bash
npm run build
# or
npx nx build TestProject
```

The built files will be in the `dist/TestProject/` directory.

## 🧪 Testing

Run the test suite:

```bash
npm test
# or
npx nx test TestProject
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── bridge/         # Bridge game components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── services/           # API and external services
├── stores/             # Zustand state stores
│   ├── userStore.ts    # User ID and player name management
│   └── roomDataStore.ts    # Room data and player position management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   └── userUtils.ts    # User management utilities
├── app.tsx             # Main application component
├── main.tsx            # Application entry point
└── styles.css          # Global styles
```

## 🔗 Backend API

This frontend application connects to a serverless backend API built with AWS Lambda. The backend repository is located at:

**[NextLevelBridgeAPI](https://github.com/jmtelgen/NextLevelBridgeAPI)**

### Backend Features

- **Authentication**: Account creation and login
- **Room Management**: Create, join, and manage game rooms
- **Game State**: Real-time game state management
- **AI/Robot Players**: AI-powered bidding and playing
- **Serverless Architecture**: AWS Lambda, API Gateway, DynamoDB

### API Endpoints

- `/account/create` - Create new user account
- `/account/login` - User authentication
- `/room/create` - Create new game room
- `/room/join` - Join existing room
- `/room/start` - Start game in room
- `/room/:id/state` - Get current game state
- `/room/:id/move` - Make game moves
- `/ai/bid` - AI bidding assistance
- `/ai/play` - AI playing assistance
- `/ai/double-dummy` - Double dummy analysis

## 🚀 Deployment

This application is configured for deployment to AWS using S3 and CloudFront for the frontend, and AWS Lambda for the backend. Follow the steps below to deploy your application.

### Prerequisites

1. **AWS CLI Configuration**: Ensure you have AWS CLI installed and configured with appropriate permissions
2. **S3 Bucket**: Create an S3 bucket for hosting static files
3. **CloudFront Distribution**: Set up a CloudFront distribution for content delivery
4. **Backend API**: Deploy the backend API from [NextLevelBridgeAPI](https://github.com/jmtelgen/NextLevelBridgeAPI)

### Quick Deployment

1. **Update Configuration**: Edit `deploy.sh` and update the following variables:
   ```bash
   BUCKET_NAME="your-s3-bucket-name"
   DISTRIBUTION_ID="your-cloudfront-distribution-id"
   ```

2. **Run Deployment Script**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

The deployment script will:
- Build the application
- Upload files to S3
- Invalidate CloudFront cache
- Provide deployment status feedback

### Manual Deployment

If you prefer to deploy manually:

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync dist/TestProject/ s3://your-bucket-name/ --delete
   ```

3. **Invalidate CloudFront Cache**:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

### AWS Infrastructure Setup

For detailed instructions on setting up the AWS infrastructure (S3 bucket, CloudFront distribution, security headers, etc.), see [cloudfront-deployment.md](./cloudfront-deployment.md).

### Backend Deployment

The backend API should be deployed first. Follow the deployment instructions in the [NextLevelBridgeAPI repository](https://github.com/jmtelgen/NextLevelBridgeAPI):

1. Clone the backend repository
2. Install Python dependencies
3. Run the deployment scripts
4. Note the API Gateway URL for frontend configuration

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npx nx graph` | View project dependency graph |
| `npx nx serve TestProject` | Serve specific project |
| `npx nx build TestProject` | Build specific project |

## 🎯 Nx Commands

This project uses Nx for monorepo management. Here are some useful Nx commands:

```bash
# Run multiple targets
npx nx run-many -t build test

# Run targets for specific projects
npx nx run-many -t build test -p TestProject

# View project graph
npx nx graph
```

## 🔒 Environment Variables

Configure environment variables for different deployment environments:

```bash
# Development
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_ENDPOINT=wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev

# Production
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com
VITE_WS_ENDPOINT=wss://ipp77av3oi.execute-api.us-west-2.amazonaws.com/dev
```

### Backend Configuration

For the backend API deployment and configuration, refer to the [NextLevelBridgeAPI repository](https://github.com/jmtelgen/NextLevelBridgeAPI) which contains:

- Lambda function deployment scripts
- API Gateway configuration (REST and WebSocket)
- DynamoDB setup instructions
- Testing and development guides

### WebSocket API

The application now supports real-time communication via WebSocket connections. For detailed WebSocket API documentation, see [WEBSOCKET_API.md](./WEBSOCKET_API.md).

**Key WebSocket Features:**
- Real-time room creation and joining
- Live bidding and card playing
- Instant game state updates
- Automatic reconnection handling
- Fallback to REST API when WebSocket unavailable
- User identification via query parameters (`userId` and `userName`)
- On-demand connection (connects when creating/joining rooms)
- Persistent connection (maintained during navigation, only disconnects on tab close)

## 📚 Additional Resources

- [Nx Documentation](https://nx.dev)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Backend API Repository](https://github.com/jmtelgen/NextLevelBridgeAPI)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page for existing solutions
2. Create a new issue with detailed information about your problem
3. Review the deployment documentation in [cloudfront-deployment.md](./cloudfront-deployment.md)

---

**Happy Gaming! 🃏**
