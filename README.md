
# 🚀 SouthStack IDE

> **A Decentralized, Offline-First, Agentic Browser IDE for the Modern Developer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build: Production](https://img.shields.io/badge/Build-Production-green.svg)](#)
[![Stack: Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS-F7DF1E.svg)](#)
[![P2P: PeerJS](https://img.shields.io/badge/P2P-PeerJS-7c6af7.svg)](#)

**SouthStack** is a high-performance, serverless IDE that runs entirely in your browser. It bridges the gap between local development and real-time collaboration by utilizing **P2P Swarm Networks**, **WebGPU-accelerated AI**, and **Local Microservices**.

---

## ✨ Key Features

### 🌐 Decentralized Collaboration (P2P Swarm)
* **Zero-Server Collaboration**: Real-time multi-user editing via PeerJS and WebRTC.
* **Presence Tracking**: Live remote cursors with unique name tags and color-coding.
* **Swarm Sync**: One-click VFS (Virtual File System) synchronization across all connected peers.

### 🤖 Intelligent Agentic Assistant
* **Offline-First AI**: Run LLMs (Qwen/Llama) locally using **WebLLM** (WebGPU) — 100% private and internet-free.
* **Cloud Hybrid**: Support for Google Gemini 1.5 & Groq APIs for high-tier reasoning when online.
* **Ghost Text**: Context-aware code completions and predictive line generation similar to industry-standard Copilots.
* **Voice Interactivity**: Integrated Speech-to-Text for hands-free prompting and Text-to-Speech for AI responses.

### ⚙️ Hybrid Execution Engine
* **Offline Python**: Native Python execution in the browser via **Pyodide** (WebAssembly).
* **Local Compiler Microservice**: A custom Node.js bridge to execute **C, C++, and Java** using your local hardware, bypassing cloud API restrictions.
* **Live Web Preview**: Sandboxed HTML/CSS/JS rendering in real-time within a new browser tab.

---

## 🛡️ Security Architecture
* **Web Worker Sandbox**: Executes JavaScript logic in an isolated thread to protect the main application state.
* **XSS Sanitization**: Strict data escaping across the terminal, chat, and markdown rendering layers.
* **Prototype Protection**: Guards the synchronization layer against malicious object property injections.

---

## 🛠️ Technical Specifications
* **Editor Core**: Monaco Editor (The engine behind VS Code).
* **P2P Architecture**: PeerJS for decentralized signaling and WebRTC.
* **AI Stack**: WebLLM (WebGPU), Gemini API, Groq API.
* **Runtime Stack**: Vanilla JavaScript (ES6+), Node.js, Pyodide (Wasm).

---

## 🚀 Installation & Setup

### 1. Prerequisites
Ensure you have **Node.js** installed on your machine.

### 2. Run the P2P Signaling Server (Offline/Local)
To enable real-time collaboration in a local network or hotspot:
```bash
npm install -g peer
peerjs --port 9000 --path /myapp
```

### 3. Run the Local Compiler (For C/C++/Java)
To execute code locally without internet, run our custom microservice:
```bash
node compiler.js
```
*Note: In IDE Settings (⚙), set the Offline Compiler URL to: `http://localhost:2000/api/v2/piston/execute`*

---

## 👥 Project Team
* **Sayeed Mortuza** - *Lead Software Architect & System Designer* | [sayeedmortuza50@gmail.com](mailto:sayeedmortuza50@gmail.com)
* **Md Farhan** - *Lead UI/UX Engineer & Quality Analyst*
* **Lamiya** - *Documentation Specialist & Frontend Developer*

---
**North South University (NSU)** **Developed for the CSE 327 Software Engineering Project** Copyright © 2026 SouthStack IDE
```
