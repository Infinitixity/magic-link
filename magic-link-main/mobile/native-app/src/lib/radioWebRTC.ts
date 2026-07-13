import { PermissionsAndroid, Platform } from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';

type SignalCallback = (targetId: string, signal: unknown) => void;
type ErrorCallback = (message: string, error?: unknown) => void;

interface PeerEntry {
  id: string;
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidate[];
}

const RTC_CONFIG = {
  iceServers: [],
};

export class RadioWebRTC {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerEntry> = new Map();
  private sendSignal: SignalCallback;
  private onError: ErrorCallback;

  constructor(sendSignal: SignalCallback, onError: ErrorCallback) {
    this.sendSignal = sendSignal;
    this.onError = onError;
  }

  get hasLocalStream(): boolean {
    return this.localStream !== null;
  }

  async enable(): Promise<void> {
    if (this.localStream) return;

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for radio voice.',
            buttonPositive: 'Grant',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          this.onError('Microphone permission denied');
          throw new Error('Microphone permission denied');
        }
      } catch (e) {
        this.onError('PermissionsAndroid.request failed', e);
        throw e;
      }
    }

    try {
      const stream = await mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      this.localStream = stream;
    } catch (e) {
      this.onError('getUserMedia failed', e);
      throw e;
    }
  }

  disable(): void {
    this.closeAllPeers();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  resetPeers(): void {
    this.closeAllPeers();
  }

  startTransmitting(): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  stopTransmitting(): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  async handlePeerJoined(peerId: string): Promise<void> {
    const entry = this.ensurePeer(peerId);
    if (!entry) return;

    if (entry.pc.signalingState !== 'stable') {
      return;
    }

    try {
      const offer = await entry.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await entry.pc.setLocalDescription(offer);
      this.sendSignal(peerId, { description: entry.pc.localDescription });
    } catch (e) {
      this.onError(`createOffer/setLocalDescription failed for peer ${peerId}`, e);
    }
  }

  handlePeerLeft(peerId: string): void {
    this.closePeer(peerId);
  }

  async handleSignal(peerId: string, signal: unknown): Promise<void> {
    const entry = this.ensurePeer(peerId);
    if (!entry) return;

    const { pc, pendingCandidates } = entry;
    const sig = signal as Record<string, unknown>;

    if (sig.description) {
      try {
        const desc = new RTCSessionDescription(
          sig.description as { type: string; sdp: string }
        );

        await pc.setRemoteDescription(desc);
        this.onError(`setRemoteDescription succeeded for peer ${peerId}`);

        while (pendingCandidates.length > 0) {
          await pc.addIceCandidate(pendingCandidates.shift()!);
        }

        if (desc.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignal(peerId, { description: pc.localDescription });
        }
      } catch (e) {
        this.onError(`handleSignal description failed for peer ${peerId}`, e);
      }
    }

    if (sig.candidate) {
      try {
        const candidate = new RTCIceCandidate(
          sig.candidate as { candidate: string; sdpMid: string; sdpMLineIndex: number }
        );
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidates.push(candidate);
        }
      } catch (e) {
        this.onError(`handleSignal candidate failed for peer ${peerId}`, e);
      }
    }
  }

  private ensurePeer(peerId: string): PeerEntry | null {
    const existing = this.peers.get(peerId);
    if (existing) return existing;
    if (!this.localStream) {
      this.onError('ensurePeer: no localStream');
      return null;
    }

    try {
      this.onError(`ensurePeer: creating RTCPeerConnection for ${peerId}`);
      const pc = new RTCPeerConnection(RTC_CONFIG);
      this.onError(`ensurePeer: RTCPeerConnection created for ${peerId}`);

      (pc as any).onicecandidate = (event: any) => {
        if (event.candidate) {
          this.sendSignal(peerId, { candidate: event.candidate });
        }
      };

      (pc as any).ontrack = () => {
      };

      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });

      const entry: PeerEntry = { id: peerId, pc, pendingCandidates: [] };
      this.peers.set(peerId, entry);
      return entry;
    } catch (e) {
      this.onError(`ensurePeer failed for ${peerId}`, e);
      return null;
    }
  }

  private closePeer(peerId: string): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.pc.close();
    this.peers.delete(peerId);
  }

  private closeAllPeers(): void {
    this.peers.forEach((entry) => {
      entry.pc.close();
    });
    this.peers.clear();
  }
}
