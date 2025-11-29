import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SCHOOL_CONTEXT } from "../knowledgeBase";

interface LiveClientCallbacks {
  onOpen: () => void;
  onMessage: (text: string | null, audioData: string | null) => void;
  onClose: () => void;
  onError: (error: Error) => void;
}

export class LiveClient {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(callbacks: LiveClientCallbacks) {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Request microphone access
    this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.sessionPromise = this.client.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        systemInstruction: SCHOOL_CONTEXT,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
      callbacks: {
        onopen: async () => {
          callbacks.onOpen();
          this.startAudioInput();
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle audio output
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          
          if (base64Audio && this.outputAudioContext) {
             // Decode and play audio
             const audioBuffer = await this.decodeAudioData(base64Audio);
             this.playAudio(audioBuffer);
             callbacks.onMessage(null, base64Audio);
          }

          // Check for turn completion to maybe trigger UI updates if we had transcription
          if (message.serverContent?.turnComplete) {
             // Logic for turn complete if needed
          }
        },
        onclose: (e) => {
          callbacks.onClose();
          this.stopAudio();
        },
        onerror: (e) => {
          callbacks.onError(new Error("Connection error"));
          this.stopAudio();
        }
      }
    });
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.audioStream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.audioStream);
    // 4096 buffer size for smoother streaming
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private createBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private async decodeAudioData(base64: string): Promise<AudioBuffer> {
    if (!this.outputAudioContext) throw new Error("Audio context not initialized");
    
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length; 
    const buffer = this.outputAudioContext.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    // Schedule playback
    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);
    source.start(this.nextStartTime);
    
    this.nextStartTime += buffer.duration;
    
    source.addEventListener('ended', () => {
      this.sources.delete(source);
    });
    this.sources.add(source);
  }

  disconnect() {
    this.sessionPromise?.then(session => session.close());
    this.stopAudio();
  }

  private stopAudio() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.sources.forEach(source => source.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }
}
