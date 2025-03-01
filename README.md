# Multimodal Live API - Web console

This repository contains a react-based starter app for using the [Multimodal Live API](<[https://ai.google.dev/gemini-api](https://ai.google.dev/api/multimodal-live)>) over a websocket. It provides modules for streaming audio playback, recording user media such as from a microphone, webcam or screen capture as well as a unified log view to aid in development of your application.

[![Multimodal Live API Demo](readme/thumbnail.png)](https://www.youtube.com/watch?v=J_q7JY1XxFE)

Watch the demo of the Multimodal Live API [here](https://www.youtube.com/watch?v=J_q7JY1XxFE).

## Security Features

This application includes a secure proxy server that protects your Gemini API key by keeping it on the server side rather than exposing it in frontend code. This prevents the API key from being visible in browser network requests.

## Usage

To get started, [create a free Gemini API key](https://aistudio.google.com/apikey) and add it to the `.env` file. Then:

```
$ npm install && npm start
```

This will start both the React frontend application and the proxy server.

We have provided several example applications on other branches of this repository:

- [demos/GenExplainer](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genexplainer)
- [demos/GenWeather](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genweather)
- [demos/GenList](https://github.com/google-gemini/multimodal-live-api-web-console/tree/demos/genlist)

## Example

Below is an example of an entire application that will use Google Search grounding and then render graphs using [vega-embed](https://github.com/vega/vega-embed):

```typescript
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

export const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export function Altair() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [
          {
            text: 'You are my helpful assistant. Any time I ask you for a graph call the "render_altair" function I have provided you. Dont ask for additional information just make your best judgement.',
          },
        ],
      },
      tools: [{ googleSearch: {} }, { functionDeclarations: [declaration] }],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}
```

## development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Project consists of:

- an Event-emitting websocket-client to ease communication between the websocket and the front-end
- communication layer for processing audio in and out
- a boilerplate view for starting to build your apps and view logs

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

_This is an experiment showcasing the Multimodal Live API, not an official Google product. We'll do our best to support and maintain this experiment but your mileage may vary. We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators' rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://developers.google.com/terms/site-policies)._

# AI Interview Prep Application

An interactive interview practice application with real-time AI interviewer and performance analytics.

## Features

- **Topic-Specific Interviews**: Choose from various professional domains (Software Engineering, Product Management, etc.)
- **Real-time Conversation**: Natural dialogue with AI interviewer
- **Live Video**: Optional video capability for realistic interview experience
- **Performance Analytics**: Detailed feedback on interview performance
- **Functional Scoring System**: Objective evaluation of your interview skills

## Functional Scoring System

The application features a robust interview analytics system that provides meaningful feedback based on your actual interview performance:

### How It Works

1. **Conversation Tracking**: The system records the entire interview conversation, including:

   - User responses (content and timing)
   - AI interviewer questions and feedback
   - Response patterns and engagement metrics

2. **Performance Analysis**: Once the interview is complete, the system analyzes:

   - **Relevance**: How well your answers match the topic-specific keywords and requirements
   - **Response Quality**: Length, structure, and substance of your answers
   - **Engagement**: Response timing and consistency
   - **Consistency**: Variation in your responses throughout the interview

3. **Scoring Algorithm**:
   - Category-specific scores (Technical Knowledge, Communication, etc.)
   - Overall interview performance score
   - Identification of strengths and areas for improvement
   - Personalized improvement tips

### Scoring Categories

Each interview type has specific scoring categories relevant to the role:

- **Software Engineering**: Technical Knowledge, Problem Solving, Code Quality, System Design, Communication
- **Product Management**: Product Strategy, User Insights, Prioritization, Cross-functional Collaboration, Communication
- **Data Science**: Statistical Knowledge, Data Manipulation, Machine Learning, Problem Analysis, Communication
- **UX Design**: Design Thinking, User Research, Visual Design, Prototyping, Communication
- **Leadership**: Strategic Thinking, Team Management, Decision Making, Conflict Resolution, Communication

### Improvement Tips

Based on your performance, the system provides actionable advice on how to improve your interview skills in each category, helping you prepare for your next real interview.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## License

Licensed under the Apache License, Version 2.0
