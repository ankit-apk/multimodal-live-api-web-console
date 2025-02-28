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

import { audioContext } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";

import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  recordingWorklet: AudioWorkletNode | undefined;
  vuWorklet: AudioWorkletNode | undefined;

  private starting: Promise<void> | null = null;
  private initializationAttempts: number = 0;
  private maxInitializationAttempts: number = 3;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    // Don't try to restart if we're already starting
    if (this.starting) {
      console.log("AudioRecorder already starting, waiting for completion");
      try {
        await this.starting;
        return this;
      } catch (error) {
        console.error("Error waiting for audio recorder to start:", error);
        throw error;
      }
    }

    // Don't try to restart if we're already recording
    if (this.recording) {
      console.log("AudioRecorder already recording");
      return this;
    }

    if (this.initializationAttempts >= this.maxInitializationAttempts) {
      console.error("Maximum number of initialization attempts reached");
      this.emit("error", new Error("Maximum number of initialization attempts reached"));
      return this;
    }

    this.initializationAttempts++;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = new Error("MediaDevices API not supported");
      this.emit("error", error);
      throw error;
    }

    this.starting = new Promise(async (resolve, reject) => {
      try {
        // Request audio permissions
        this.stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        
        // Create audio context
        this.audioContext = await audioContext({ sampleRate: this.sampleRate });
        
        // Create source node
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        // Add recording worklet
        const workletName = "audio-recorder-worklet";
        const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

        await this.audioContext.audioWorklet.addModule(src);
        this.recordingWorklet = new AudioWorkletNode(
          this.audioContext,
          workletName,
        );

        this.recordingWorklet.port.onmessage = async (ev: MessageEvent) => {
          // worklet processes recording floats and messages converted buffer
          if (ev.data && ev.data.data && ev.data.data.int16arrayBuffer) {
            const arrayBuffer = ev.data.data.int16arrayBuffer;
            const arrayBufferString = arrayBufferToBase64(arrayBuffer);
            this.emit("data", arrayBufferString);
          }
        };
        
        this.source.connect(this.recordingWorklet);

        // Add VU meter worklet
        const vuWorkletName = "vu-meter";
        await this.audioContext.audioWorklet.addModule(
          createWorketFromSrc(vuWorkletName, VolMeterWorket),
        );
        this.vuWorklet = new AudioWorkletNode(this.audioContext, vuWorkletName);
        this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
          if (ev.data && typeof ev.data.volume === 'number') {
            this.emit("volume", ev.data.volume);
          }
        };

        this.source.connect(this.vuWorklet);
        this.recording = true;
        
        // Resume the audio context if it's suspended
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        resolve();
      } catch (error) {
        console.error("Error starting audio recorder:", error);
        this.emit("error", error);
        reject(error);
      } finally {
        this.starting = null;
      }
    });

    try {
      await this.starting;
      console.log("AudioRecorder successfully started");
      return this;
    } catch (error) {
      console.error("Failed to start AudioRecorder:", error);
      this.stop();
      throw error;
    }
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      try {
        if (this.source) {
          this.source.disconnect();
          this.source = undefined;
        }
        
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = undefined;
        }
        
        this.recordingWorklet = undefined;
        this.vuWorklet = undefined;
        this.recording = false;
        
        console.log("AudioRecorder stopped");
      } catch (error) {
        console.error("Error stopping AudioRecorder:", error);
      }
    };

    if (this.starting) {
      this.starting.then(handleStop).catch((error) => {
        console.error("Error in stopping after start:", error);
        handleStop();
      });
      return this;
    }
    
    handleStop();
    return this;
  }
}
