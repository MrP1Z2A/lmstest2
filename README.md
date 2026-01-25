
# EduSphere LMS - Local Setup Guide

EduSphere is a NextGen AI-powered Learning Management System built with React, Vite, Tailwind CSS, and Google Gemini API.

## Prerequisites

- **Node.js**: Version 18.0 or later.
- **npm**: Installed with Node.js.

## Installation

1.  **Clone or Download** this directory to your computer.
2.  Open your terminal or command prompt in the project root folder.
3.  Install all required packages:
    ```bash
    npm install
    ```

## Configuration (AI Features)

To enable AI Summarization and Quiz Generation, you need a Google Gemini API Key.

1.  Create a new file named `.env` in the project's root folder.
2.  Add your API key inside the `.env` file like this:
    ```env
    API_KEY=your_actual_gemini_api_key_here
    ```
    *You can obtain an API key for free from the [Google AI Studio](https://aistudio.google.com/).*

## Running Locally

To start the development server:
```bash
npm run dev
```
The terminal will provide a link (usually `http://localhost:5173`). Open it in your browser.

## Credentials for Testing

- **Student Role**: 
  - User ID: `user1`
  - Access Key: `123456`
- **Teacher Role**: 
  - User ID: `teacher1`
  - Access Key: `123456`

## Project Structure

- `App.tsx`: Main application logic and routing.
- `constants.tsx`: Mock data and initial configurations.
- `types.ts`: TypeScript interfaces and enums.
- `components/`: UI components like Sidebar, CourseCard, and Login.
- `services/`: AI service integration using `@google/genai`.
