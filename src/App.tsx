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

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import TopicSelection from "./components/topic-selection/TopicSelection";
import FeedbackScorecard from "./components/feedback-scorecard/FeedbackScorecard";
import InterviewTrackingService from "./services/InterviewTrackingService";
import cn from "classnames";

// No need to get API key in frontend as it's now handled by the proxy server
// We can optionally validate if the proxy server is reachable
const proxyUri = `ws://${window.location.hostname}:3001/api/ws`;

// Define interview topic type
interface InterviewTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// Define application states
type AppState = 'selection' | 'interview' | 'feedback';

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  // Track selected interview topic
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopic | null>(null);
  // Track application state
  const [appState, setAppState] = useState<AppState>('selection');

  const handleTopicSelect = (topic: InterviewTopic) => {
    console.log("Selected topic:", topic);
    setSelectedTopic(topic);
    setAppState('interview');
  };

  const handleInterviewComplete = () => {
    // End the tracking session when interview is complete
    if (selectedTopic) {
      const trackingService = InterviewTrackingService.getInstance();
      trackingService.endSession();
      console.log("Interview session ended, transitioning to feedback");
    }
    
    setAppState('feedback');
  };

  const handleRestartInterview = () => {
    setSelectedTopic(null);
    setAppState('selection');
  };

  return (
    <div className="App">
      <LiveAPIProvider 
        url={proxyUri} 
        topic={selectedTopic || undefined}
      >
        {appState === 'selection' ? (
          <TopicSelection onTopicSelect={handleTopicSelect} />
        ) : appState === 'feedback' && selectedTopic ? (
          <FeedbackScorecard topic={selectedTopic} onRestart={handleRestartInterview} />
        ) : (
          <div className="meet-container">
            <header className="meet-header">
              <div className="meet-logo">AI Interview Prep</div>
              <div className="meet-info">
                {selectedTopic?.title} Interview
                <div className="topic-description">{selectedTopic?.description}</div>
              </div>
              <div className="meet-actions">
                <button 
                  className="action-button" 
                  onClick={handleInterviewComplete} 
                  title="End interview and view feedback"
                >
                  <span className="material-symbols-outlined">done</span>
                </button>
                <button 
                  className="action-button" 
                  onClick={() => setSelectedTopic(null)} 
                  title="Change topic"
                >
                  <span className="material-symbols-outlined">refresh</span>
                </button>
                <button className="action-button" title="More information">
                  <span className="material-symbols-outlined">info</span>
                </button>
              </div>
            </header>
            
            <div className="meet-content">
              <main className="video-area full-width">
                <div className={cn("video-container", {
                  "has-video": videoRef.current && videoStream,
                })}>
                  {/* Main video display */}
                  <video
                    className={cn("main-video-stream", {
                      hidden: !videoRef.current || !videoStream,
                    })}
                    ref={videoRef}
                    autoPlay
                    playsInline
                  />
                  {/* When no video is active, show placeholder */}
                  {(!videoRef.current || !videoStream) && (
                    <div className="video-placeholder">
                      <div className="placeholder-icon">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <p>Turn on your camera to start the interview</p>
                    </div>
                  )}
                  <Altair className="altair-overlay" />
                </div>

                <ControlTray
                  videoRef={videoRef}
                  supportsVideo={true}
                  onVideoStreamChange={setVideoStream}
                >
                  <button 
                    className="control-button interview-complete" 
                    onClick={handleInterviewComplete}
                    title="End interview and view feedback"
                  >
                    <span className="material-symbols-outlined">assessment</span>
                  </button>
                </ControlTray>
              </main>
            </div>
          </div>
        )}
      </LiveAPIProvider>
    </div>
  );
}

export default App;
