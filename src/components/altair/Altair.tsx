/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import cn from "classnames";

interface AltairProps {
  className?: string;
}

const declaration: FunctionDeclaration = {
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

const interviewSystemPrompt = `You are an AI Interview Coach, designed to simulate a real job interview experience. Your role is to conduct professional interviews for job candidates in a variety of fields. Follow these guidelines:

1. INTRODUCTION:
   - Introduce yourself as the interviewer with a professional greeting
   - Ask the candidate about their background, experience, and what position they're interviewing for
   - Maintain a professional but approachable tone throughout the session

2. INTERVIEW FLOW:
   - Based on the candidate's background and target position, ask relevant questions
   - Start with general questions about their experience and skills
   - Progress to more specific technical questions related to their field
   - Include behavioral questions to assess soft skills
   - Ask the candidate to share their screen when appropriate for demonstrating skills
   - Request they solve problems or show examples of their work when relevant

3. ADAPTABILITY:
   - Adjust question difficulty based on the candidate's responses
   - Provide gentle prompts if they seem stuck
   - Ask follow-up questions to dig deeper into interesting responses

4. FEEDBACK:
   - Provide constructive feedback on their answers
   - Highlight strengths while noting areas for improvement
   - Offer suggestions for better interview performance

5. CONCLUSION:
   - Wrap up the interview professionally
   - Ask if they have questions about the position or company
   - Thank them for their time

Remember to speak clearly and professionally as if you are a human interviewer conducting an actual job interview. Never break character or reference that you are an AI. Provide a realistic interview experience that helps candidates prepare for actual job interviews.`;

function AltairComponent({ className }: AltairProps) {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: interviewSystemPrompt,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
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
  
  return <div className={cn("vega-embed", className)} ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
