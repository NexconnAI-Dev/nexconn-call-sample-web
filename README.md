# Nexconn Call Sample Web

A lightweight Web demo for external integration, built with **Vue 3 + Vite**. It helps you quickly validate the core capabilities of the **Nexconn Call Web SDK** and serves as a reference template for secondary development.

## Core Features

### 1-to-1 Calling

- Initiate and receive 1-to-1 audio/video calls
- Accept or reject incoming calls
- Toggle camera and microphone states during calls
- Switch between audio and video modes during calls

### Group Calling

- Support multi-party audio/video conferences
- Invite new participants during active calls
- Real-time participant status updates
- Simultaneous rendering of multiple video streams

## Tech Stack

- Vue 3
- Vite 5
- `@nexconn/call`
- `@nexconn/chat`
- `@nexconn/engine`

## Quick Start

1. Clone the project and install dependencies

```bash
git clone <repository-url>
cd nexconn-call-sample-web
npm install
```

2. Start the development server

```bash
npm run dev
```

3. Open the browser  
Visit the address shown in terminal output (typically `http://localhost:5173`).

4. Fill in credentials and connect
- Refer to the [User Registration](https://docs.nexconn.ai/platform-chat-api/user/register) guide to obtain `App Key` and `User Token`
- Enter `appKey` and `userToken` on the demo home page, then log in

## Requirements

- Node.js: 18+ (20 LTS recommended)
- npm: 9+
- Modern WebRTC-capable browsers (Chrome / Firefox / Safari)
- HTTPS is recommended for production (`localhost` excluded)

## Project Structure

```text
nexconn-call-sample-web/
├── src/
│   ├── main.js                 # App entry
│   ├── App.vue                 # Root component
│   ├── router/
│   │   └── index.js            # Router configuration
│   ├── views/
│   │   ├── Login.vue           # Login and connection
│   │   ├── SingleCall.vue      # 1-to-1 call page
│   │   └── MultiCall.vue       # Group call page
│   └── utils/
│       ├── NCEngine.js         # Nexconn SDK wrapper and event dispatch
│       └── videoHelper.js      # Video view mount/update helper
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── README.md                   # This document
```

## Documentation

- Web Call SDK: <https://docs.nexconn.ai/callsdk-web>
- User Registration: <https://docs.nexconn.ai/platform-chat-api/user/register>
- Documentation Home: <https://docs.nexconn.ai>
