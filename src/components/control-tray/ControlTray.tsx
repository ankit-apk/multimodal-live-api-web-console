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

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
  label: string;
  className?: string;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop, label, className }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button 
        className={cn("control-button", className, { "active": isStreaming })} 
        onClick={stop}
        title={`Turn off ${label}`}
      >
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button 
        className={cn("control-button", className)}
        onClick={start}
        title={`Turn on ${label}`}
      >
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const micInitializedRef = useRef<boolean>(false);
  const isMicStartingRef = useRef<boolean>(false);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  // Add event listener for audio recorder errors
  useEffect(() => {
    const onAudioError = (error: Error) => {
      console.error("Audio recorder error:", error);
      setMicError(error.message || "Error with microphone access");
      setMuted(true);
    };

    audioRecorder.on("error", onAudioError);
    
    return () => {
      audioRecorder.off("error", onAudioError);
    };
  }, [audioRecorder]);

  // Separated useEffect for microphone initialization and permission handling
  useEffect(() => {
    const initializeMicrophone = async () => {
      if (!micInitializedRef.current && !isMicStartingRef.current) {
        isMicStartingRef.current = true;
        try {
          // Request microphone permission explicitly
          await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            } 
          });
          
          micInitializedRef.current = true;
          setMicError(null);
          console.log("Microphone permissions granted");
        } catch (error) {
          console.error("Error requesting microphone permissions:", error);
          setMicError("Could not access microphone. Please check your browser permissions.");
          setMuted(true); // Force mute if permissions denied
        } finally {
          isMicStartingRef.current = false;
        }
      }
    };

    initializeMicrophone();
  }, []);

  // Separate effect for audio recording
  useEffect(() => {
    let isActive = false;
    
    const onData = (base64: string) => {
      if (connected && !muted && isActive) {
        client.sendRealtimeInput([
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        ]);
      }
    };

    const onVolumeChange = (volume: number) => {
      if (isActive) {
        setInVolume(volume);
      }
    };

    const setupAudioRecorder = async () => {
      if (connected && !muted && micInitializedRef.current && !isActive) {
        try {
          console.log("Starting audio recorder");
          await audioRecorder
            .on("data", onData)
            .on("volume", onVolumeChange)
            .start();
          
          isActive = true;
          setMicError(null);
        } catch (error) {
          console.error("Failed to start audio recorder:", error);
          setMicError("Failed to start microphone recording");
          setMuted(true);
        }
      } else if ((!connected || muted) && isActive) {
        console.log("Stopping audio recorder");
        audioRecorder
          .off("data", onData)
          .off("volume", onVolumeChange)
          .stop();
        
        isActive = false;
      }
    };

    setupAudioRecorder();

    return () => {
      if (isActive) {
        audioRecorder
          .off("data", onData)
          .off("volume", onVolumeChange)
          .stop();
        
        isActive = false;
      }
    };
  }, [connected, muted, audioRecorder, client, micInitializedRef]);

  /**
   * hack a frame every second to capture video
   */
  useEffect(() => {
    let intervalId: any;

    function sendVideoFrame() {
      if (
        activeVideoStream &&
        videoRef.current &&
        renderCanvasRef.current &&
        connected
      ) {
        const video = videoRef.current;
        const canvas = renderCanvasRef.current;
        const ctx = canvas.getContext("2d")!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const scale = Math.min(
          480 / video.videoWidth,
          360 / video.videoHeight,
          1,
        );
        ctx.drawImage(
          video,
          0,
          0,
          canvas.width * scale,
          canvas.height * scale,
        );
        canvas.toBlob(
          (b) => {
            if (b) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result as string;
                // Extract the base64 data part from the data URL
                const base64 = base64data.split(',')[1];
                client.sendRealtimeInput([
                  {
                    mimeType: "image/jpeg",
                    data: base64,
                  },
                ]);
              };
              reader.readAsDataURL(b);
            }
          },
          "image/jpeg",
          0.75,
        );
      }
    }

    if (activeVideoStream && connected) {
      intervalId = setInterval(sendVideoFrame, 1000);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [activeVideoStream, videoRef, renderCanvasRef, client, connected]);

  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next?.isStreaming) {
      // Its on already, turn it off
      setActiveVideoStream(null);
      onVideoStreamChange(null);
      await next.stop();
    } else {
      // Turn off all other streams first
      for (const stream of videoStreams) {
        if (stream.isStreaming && stream !== next) {
          await stream.stop();
        }
      }
      if (next) {
        // turn on new stream
        const stream = await next.start();
        if (videoRef?.current) {
          videoRef.current.srcObject = stream;
        }
        if (renderCanvasRef.current) {
          renderCanvasRef.current.width = 480;
          renderCanvasRef.current.height = 360;
        }
        setActiveVideoStream(stream);
        onVideoStreamChange(stream);
      }
    }
  };

  const handleMicToggle = async () => {
    if (isMicStartingRef.current) {
      console.log("Microphone initialization in progress, please wait");
      return;
    }

    if (muted) {
      // Trying to unmute
      if (!micInitializedRef.current) {
        isMicStartingRef.current = true;
        try {
          // Request microphone permission
          await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          
          micInitializedRef.current = true;
          setMicError(null);
          setMuted(false);
        } catch (error) {
          console.error("Could not access microphone:", error);
          setMicError("Could not access microphone. Please check your browser permissions.");
        } finally {
          isMicStartingRef.current = false;
        }
      } else {
        // Mic already initialized, just unmute
        setMuted(false);
        setMicError(null);
      }
    } else {
      // Simply mute
      setMuted(true);
    }
  };

  return (
    <section className="control-tray">
      {micError && (
        <div className="mic-error-message">
          {micError}
          <button onClick={() => setMicError(null)}>Dismiss</button>
        </div>
      )}
      <div className="controls">
        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              onIcon="videocam"
              offIcon="videocam_off"
              start={changeStreams(webcam)}
              stop={changeStreams(webcam)}
              label="camera"
            />
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              onIcon="cast"
              offIcon="cast"
              start={changeStreams(screenCapture)}
              stop={changeStreams(screenCapture)}
              label="screen share"
            />
          </>
        )}
        <button
          className={cn("control-button", { 
            "active": !muted, 
            "disabled": isMicStartingRef.current 
          })}
          onClick={handleMicToggle}
          disabled={isMicStartingRef.current}
          title={muted ? "Unmute microphone" : "Mute microphone"}
        >
          <span className="material-symbols-outlined">
            {muted ? "mic_off" : "mic"}
          </span>
        </button>

        {connected ? (
          <button
            className="control-button hang-up"
            onClick={disconnect}
            title="End interview"
          >
            <span className="material-symbols-outlined">call_end</span>
          </button>
        ) : (
          <button
            className="control-button"
            ref={connectButtonRef}
            onClick={connect}
            title="Start interview"
          >
            <span className="material-symbols-outlined">call</span>
          </button>
        )}

        {children}
      </div>
      <div className="audio-indicators">
        {!muted && <AudioPulse active={true} volume={inVolume} hover={false} />}
        <AudioPulse active={connected} volume={volume} hover={false} />
      </div>
      <canvas
        style={{ display: "none" }}
        className="render-canvas"
        ref={renderCanvasRef}
      />
    </section>
  );
}

export default memo(ControlTray);
