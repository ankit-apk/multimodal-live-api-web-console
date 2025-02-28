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
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import cn from "classnames";

// No need to get API key in frontend as it's now handled by the proxy server
// We can optionally validate if the proxy server is reachable
const proxyUri = `ws://${window.location.hostname}:3001/api/ws`;

function App() {
  // this video reference is used for displaying the active stream, whether that is the webcam or screen capture
  // feel free to style as you see fit
  const videoRef = useRef<HTMLVideoElement>(null);
  // either the screen capture, the video or null, if null we hide it
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  return (
    <div className="App">
      <LiveAPIProvider url={proxyUri}>
        <div className="meet-container">
          <header className="meet-header">
            <div className="meet-logo">AI Interview Prep</div>
            <div className="meet-info">Interview Session</div>
            <div className="meet-actions">
              <button className="action-button">
                <span className="material-symbols-outlined">info</span>
              </button>
            </div>
          </header>
          
          <div className="meet-content">
            <main className="video-area">
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
              />
            </main>
            
            <SidePanel />
          </div>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
