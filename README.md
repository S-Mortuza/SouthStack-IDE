# SouthStack IDE — Professional Overview

SouthStack is a modern, browser-based decentralized code editor offering a full development environment within a single web page. It integrates real-time P2P collaboration with sophisticated offline and cloud-based AI capabilities to provide a seamless coding experience without a central server.

## Core Features

### Swarm Network (P2P Collaboration)
* **Real-time Live Editing**: Enables collaborative coding without a central server using the PeerJS framework.
* **Remote Cursors**: Tracks collaborators in real-time with unique colors and identifying labels to ensure smooth team workflows.
* **Project Synchronization**: Synchronizes the entire Virtual File System (VFS) across peers instantly with a single action.

### Intelligent AI Agents
* **Offline AI (WebGPU)**: Executes Qwen and Llama models locally within the browser using WebLLM technology for private, internet-free assistance.
* **Hybrid AI Support**: Leverages Google Gemini 1.5 and Groq APIs for high-performance cloud-based reasoning when internet access is available.
* **Ghost Text**: Provides context-aware code completion and predictive line generation similar to industry-standard copilot tools.
* **Integrated Code Insertion**: Allows users to directly insert AI-generated snippets into the editor at the current cursor position.

### Hybrid Execution Engine
* **Offline Python Support**: Utilizes Pyodide for browser-based Python execution, including support for standard input/output.
* **Multi-Language Compilation**: Facilitates compilation for C, C++, Java, Rust, and Go through the Piston API.
* **HTML Live Preview**: Includes an integrated rendering mode to preview HTML code directly in a new browser tab.

### Virtual File System (VFS)
* **Persistent Storage**: Maintains file integrity and chat session history across browser reloads using IndexedDB and LocalStorage.
* **Import and Export**: Supports importing local files into the VFS and downloading entire projects as organized ZIP archives.

### Voice AI Capabilities
* **Voice-to-Text Input**: Enables hands-free prompt engineering and command input through speech recognition.
* **Auditory AI Responses**: Provides text-to-speech functionality for AI replies, allowing users to listen to explanations and code descriptions.

## Security Architecture
* **Isolated JavaScript Execution**: Employs a Web Worker Blob Sandbox to run user scripts in a separate thread, protecting the main application context, API keys, and local data.
* **XSS Mitigation**: Implements strict data escaping for all terminal outputs and chat interface components.
* **Prototype Pollution Guard**: Secures the project synchronization process to prevent malicious object property injection from connected peers.

## Technical Specifications
* **Editor Core**: Powered by the Monaco Editor engine (VS Code).
* **P2P Framework**: PeerJS for decentralized signaling and data transfer.
* **AI Integration**: WebLLM (WebGPU), Gemini API, and Groq API.
* **Logic Stack**: Pure Vanilla JavaScript with a modular architecture.
* **Design System**: CSS3 styling utilizing Syne and JetBrains Mono typography.

## Project Setup and Usage
1. Clone the repository to your local directory.
2. Open index.html in a web browser using a local server environment.
3. For local P2P signaling in offline environments, execute the following command: `npx peerjs --port 9000 --path /myapp`.
4. Add personal API keys for Google Gemini or Groq within the IDE settings panel to enable cloud features.

## Team Credits
* **Sayeed Mortuza**: 
* **Md Farhan**: 
* **Lamiya**: 

---
Copyright 2026 SouthStack IDE — Developed for the CSE 327 Project.
