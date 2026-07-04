# Contributing to DineInGo

First off, thank you for taking the time to contribute to DineInGo! 🎉

DineInGo is a smart restaurant and event booking platform built with a modern TypeScript stack (React, Vite, Node.js, Express, Socket.io, MongoDB). Your contributions help make this project better for everyone.

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating in this community.

---

## Table of Contents
1. [How to Contribute](#how-to-contribute)
   - [Reporting Bugs](#reporting-bugs)
   - [Suggesting Features](#suggesting-features)
   - [Submitting Pull Requests](#submitting-pull-requests)
2. [Local Development Setup](#local-development-setup)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
3. [Coding Guidelines](#coding-guidelines)
   - [Language & Frameworks](#language--frameworks)
   - [Code Style & Linting](#code-style--linting)
   - [Git Branch & Commit Conventions](#git-branch--commit-conventions)

---

## How to Contribute

### Reporting Bugs
If you find a bug in the application, please search the existing issues to ensure it hasn't already been reported. If it is new, open a new issue using our **Bug Report** template and include:
* A clear, descriptive title.
* Step-by-step instructions to reproduce the issue.
* Expected vs. actual behavior.
* Screenshots or screen recordings, if applicable.
* Relevant details about your environment (OS, browser, device, versions).

### Suggesting Features
We welcome ideas for new features or enhancements! Please search the existing issues to see if your feature is already under discussion. To suggest a new feature, open a new issue using the **Feature Request** template and include:
* A clear and concise description of the feature.
* The problem this feature solves and why it is needed.
* Any alternative solutions or workarounds you've considered.
* Visual mockups or flowcharts if relevant.

### Submitting Pull Requests
1. **Fork the Repository**: Create your own copy of the repository.
2. **Create a Branch**: Create a branch off the main branch (e.g., `feature/add-interactive-floor-plan` or `bugfix/resolve-booking-overlap`).
3. **Make Your Changes**: Ensure your code follows our guidelines and style rules.
4. **Write Tests**: If adding new features or fixing critical bugs, write automated tests or explain how you verified them.
5. **Lint and Format**: Run the project linter and formatter before committing.
6. **Submit PR**: Open a pull request against our `main` branch. Provide a clear description of the changes in the pull request template.

---

## Local Development Setup

### Prerequisites
To run DineInGo locally, you will need:
* **Node.js** (v18 or higher recommended)
* **MongoDB** (Local instance or MongoDB Atlas URI)
* **npm** or **yarn**

### Backend Setup
The backend is a Node.js + Express application written in TypeScript.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   * Copy `.env.example` to `.env`
   * Configure your MongoDB URI, JWT Secret, Firebase keys, Port, and Nodemailer credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
The frontend is built with React 18, Vite, and Tailwind CSS.

1. Navigate back to the root directory (if you were in backend/):
   ```bash
   cd ..
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   * Copy `.env.example` to `.env.local`
   * Configure the base API URLs and Firebase project credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## Coding Guidelines

### Language & Frameworks
* **TypeScript**: Use strict TypeScript typing where possible. Avoid the `any` type.
* **React**: Use functional components, custom hooks, and context APIs.
* **Express & Mongoose**: Write modular controllers, routes, and robust schema validation using middleware.
* **Real-time updates**: Use Socket.io helper utilities consistently for real-time events.

### Code Style & Linting
* We use **ESLint** for code quality. You can run `npm run lint` to check for violations.
* Please keep code formatted nicely, using standard spaces, tabs, and semicolons.

### Git Branch & Commit Conventions
We use structured branch names and commit messages to make project history easy to read:

* **Branch prefixes**:
  * `feature/...` for new features
  * `bugfix/...` for bug fixes
  * `hotfix/...` for urgent production fixes
  * `docs/...` for documentation updates
* **Commit messages**:
  * Write clear, concise titles in the imperative mood (e.g., `feat: add interactive event seating chart` or `fix: handle table unblocking on cancel`).
