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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import InterviewTrackingService from "../services/InterviewTrackingService";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
  topic,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  // API key is now optional since it's handled by the proxy server
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  
  // Track if we've initialized the session
  const sessionInitialized = useRef(false);
  
  // Initialize tracking service session when topic is set
  useEffect(() => {
    if (topic && !sessionInitialized.current) {
      const trackingService = InterviewTrackingService.getInstance();
      trackingService.startSession(topic);
      sessionInitialized.current = true;
      
      console.log(`Started tracking interview session for topic: ${topic.title}`);
    }
  }, [topic]);
  
  // Include the interview topic in the system instructions if provided
  const [config, setConfig] = useState<LiveConfig>(() => {
    const baseConfig: LiveConfig = {
      model: "models/gemini-2.0-flash-exp",
    };
    
    // If a topic is provided, add system instructions for the interview
    if (topic) {
      // Get the evaluation categories for this topic
      const getCategories = (topicId: string): string[] => {
        switch(topicId) {
          case 'software-engineering':
            return ['Technical Knowledge', 'Problem Solving', 'Code Quality', 'System Design', 'Communication'];
          case 'product-management':
            return ['Product Strategy', 'User Insights', 'Prioritization', 'Cross-functional Collaboration', 'Communication'];
          case 'data-science':
            return ['Statistical Knowledge', 'Data Manipulation', 'Machine Learning', 'Problem Analysis', 'Communication'];
          case 'ux-design':
            return ['Design Thinking', 'User Research', 'Visual Design', 'Prototyping', 'Communication'];
          case 'leadership':
            return ['Strategic Thinking', 'Team Management', 'Decision Making', 'Conflict Resolution', 'Communication'];
          default:
            return ['Subject Knowledge', 'Critical Thinking', 'Communication', 'Problem Solving', 'Adaptability'];
        }
      };
      
      const categories = getCategories(topic.id);
      const categoriesText = categories.join(', ');
      
      baseConfig.systemInstruction = {
        parts: [
          {
            text: `You are an AI interviewer for a ${topic.title} position. 
This is a ${topic.title} interview focusing on: ${topic.description}.

EVALUATION CATEGORIES:
The candidate will be evaluated on these specific categories: ${categoriesText}.

INTERVIEW STRUCTURE:
1. Introduction: Briefly introduce yourself and explain the interview process.
2. Category Questions: Ask questions that specifically cover each evaluation category.
   - For each category, ask at least one question directly related to that skill.
   - Clearly indicate which category you're exploring with each question.
3. Scenario-Based Questions: Present realistic scenarios related to the role.
4. Final Question: Give the candidate a chance to ask questions or share final thoughts.

Ask relevant questions for this role, challenge the candidate with real-world scenarios, and provide feedback.
Your tone should be professional but conversational.
Structure the interview progressively from easier to more challenging questions.
Limit your responses to around 2-3 sentences to maintain a natural conversation flow.
Start by introducing yourself and the purpose of the interview.`
          }
        ]
      };
      
      // Also include responseModalities to enable audio
      baseConfig.generationConfig = {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore" // A natural sounding voice
            }
          }
        }
      };
    }
    
    return baseConfig;
  });
  
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    if (!client) return;
    
    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
      
    // Track AI responses
    const onContent = (content: any) => {
      if (topic && sessionInitialized.current) {
        const trackingService = InterviewTrackingService.getInstance();
        // Extract the text content from the response
        let text = '';
        
        if (content && content.modelTurn && content.modelTurn.parts) {
          // Find text parts in the modelTurn
          const textParts = content.modelTurn.parts.filter(
            (part: any) => part.text && typeof part.text === 'string'
          );
          
          if (textParts.length > 0) {
            text = textParts.map((part: any) => part.text).join(' ');
          }
        }
        
        if (text) {
          trackingService.addMessage('ai', text);
        }
      }
    };

    // Create a wrapper for the client.send method to track user messages
    const originalSend = client.send;
    client.send = function(parts: any, turnComplete: boolean = true) {
      // Track user message before sending
      if (topic && sessionInitialized.current) {
        const trackingService = InterviewTrackingService.getInstance();
        
        // Extract text from parts
        if (parts) {
          let text = '';
          const partsArray = Array.isArray(parts) ? parts : [parts];
          
          partsArray.forEach(part => {
            if (part && part.text && typeof part.text === 'string') {
              text += part.text + ' ';
            }
          });
          
          if (text.trim()) {
            trackingService.addMessage('user', text.trim());
          }
        }
      }
      
      // Call the original method
      return originalSend.call(client, parts, turnComplete);
    };

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("content", onContent);

    return () => {
      // Restore original send method
      if (client.send !== originalSend) {
        client.send = originalSend;
      }
      
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("content", onContent);
    };
  }, [client, topic]);

  const connect = useCallback(async () => {
    console.log(config);
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    await client.connect(config);
    setConnected(true);
  }, [client, setConnected, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}
