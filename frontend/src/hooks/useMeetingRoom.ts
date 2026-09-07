"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketUrl } from "@/lib/api";
import { ChatMessage, RoomParticipant } from "@/types/meeting";

interface UseMeetingRoomOptions {
  meetingCode: string;
  clientId: string;
  displayName: string;
  isHost: boolean;
  initialAudioMuted?: boolean;
  initialVideoMuted?: boolean;
  onKicked?: (reason: string) => void;
  onMeetingEnded?: (reason: string) => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useMeetingRoom({
  meetingCode,
  clientId,
  displayName,
  isHost,
  initialAudioMuted = false,
  initialVideoMuted = false,
  onKicked,
  onMeetingEnded,
}: UseMeetingRoomOptions) {
  // Local media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(initialAudioMuted);
  const [isVideoMuted, setIsVideoMuted] = useState(initialVideoMuted);

  // Screen share states & refs
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Participants & Connections
  const [remoteParticipants, setRemoteParticipants] = useState<RoomParticipant[]>([]);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // In-meeting Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // Reactions & Hand Raise
  const [reactions, setReactions] = useState<Record<string, { emoji: string; id: number }>>({});
  const [handRaisedMap, setHandRaisedMap] = useState<Record<string, boolean>>({});

  // Socket and pending message buffer
  const wsRef = useRef<WebSocket | null>(null);
  const pendingWsMessages = useRef<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Keep latest refs for callbacks to avoid re-creating WebSocket
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  const onMeetingEndedRef = useRef(onMeetingEnded);
  onMeetingEndedRef.current = onMeetingEnded;

  // Send to socket or queue if connecting
  const sendSocketMessage = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (err) {
        console.warn("Failed to send WebSocket message:", err);
      }
    } else {
      pendingWsMessages.current.push(data);
    }
  }, []);

  // 1. Initialize Local Camera / Microphone Media Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupLocalMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });
        activeStream = stream;
        localStreamRef.current = stream;

        // Apply initial audio mute state
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !initialAudioMuted;
        });

        // Apply initial video mute state
        stream.getVideoTracks().forEach((track) => {
          track.enabled = !initialVideoMuted;
        });

        setLocalStream(stream);
      } catch (err: any) {
        console.warn("Camera/Mic access warning, trying audio-only fallback:", err);
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          activeStream = audioOnly;
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          setIsVideoMuted(true);
        } catch (e) {
          console.warn("No camera or mic accessible:", e);
        }
      }
    }

    setupLocalMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      localStreamRef.current = null;
    };
  }, [initialAudioMuted, initialVideoMuted]);

  // 2. PeerConnection Helper
  const createPeerConnection = useCallback(
    (targetClientId: string, targetName: string) => {
      if (peerConnections.current.has(targetClientId)) {
        return peerConnections.current.get(targetClientId)!;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks (prefer screen share if active, else camera)
      const streamToSend = screenStreamRef.current || localStreamRef.current;
      if (streamToSend) {
        streamToSend.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, streamToSend);
          } catch {}
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSocketMessage({
            type: "ice-candidate",
            target: targetClientId,
            candidate: event.candidate,
          });
        }
      };

      // Handle incoming remote track
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        setRemoteParticipants((prev) => {
          const exists = prev.find((p) => p.clientId === targetClientId);
          if (exists) {
            return prev.map((p) =>
              p.clientId === targetClientId ? { ...p, stream: remoteStream } : p
            );
          }
          return [
            ...prev,
            {
              clientId: targetClientId,
              displayName: targetName,
              isHost: false,
              isAudioMuted: false,
              isVideoMuted: false,
              stream: remoteStream,
            },
          ];
        });
      };

      peerConnections.current.set(targetClientId, pc);
      return pc;
    },
    [sendSocketMessage]
  );

  // 3. Setup WebSocket Connection (Stable: depends ONLY on meetingCode and clientId)
  useEffect(() => {
    if (!meetingCode || !clientId) return;

    const wsUrl = getWebSocketUrl(
      meetingCode,
      clientId,
      displayNameRef.current,
      isHostRef.current
    );
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Flush any queued messages
      while (pendingWsMessages.current.length > 0) {
        const msg = pendingWsMessages.current.shift();
        try {
          ws.send(JSON.stringify(msg));
        } catch {}
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;

        switch (type) {
          case "room-state": {
            const existingList: any[] = data.participants || [];
            const updated: RoomParticipant[] = [];

            for (const p of existingList) {
              const pId = p.clientId || p.client_id;
              if (pId && pId !== clientId) {
                const pName = p.displayName || p.display_name || "Participant";
                const pHost = p.isHost ?? p.is_host ?? false;
                const pAudioMuted = p.isAudioMuted ?? p.is_audio_muted ?? false;
                const pVideoMuted = p.isVideoMuted ?? p.is_video_muted ?? false;
                const pScreenSharing = p.isScreenSharing ?? p.is_screen_sharing ?? false;

                updated.push({
                  clientId: pId,
                  displayName: pName,
                  isHost: pHost,
                  isAudioMuted: pAudioMuted,
                  isVideoMuted: pVideoMuted,
                  isScreenSharing: pScreenSharing,
                  stream: null,
                });

                // Establish peer connection with existing participant
                createPeerConnection(pId, pName);
              }
            }
            setRemoteParticipants(updated);
            break;
          }

          case "participant-joined":
          case "user-joined": {
            const newClientId =
              data.clientId ||
              data.client_id ||
              data.participant?.clientId ||
              data.participant?.client_id;
            const newName =
              data.displayName ||
              data.display_name ||
              data.participant?.displayName ||
              data.participant?.display_name ||
              "Participant";
            const newIsHost =
              data.isHost ??
              data.is_host ??
              data.participant?.isHost ??
              data.participant?.is_host ??
              false;

            if (newClientId && newClientId !== clientId) {
              setRemoteParticipants((prev) => {
                if (prev.some((p) => p.clientId === newClientId)) return prev;
                return [
                  ...prev,
                  {
                    clientId: newClientId,
                    displayName: newName,
                    isHost: newIsHost,
                    isAudioMuted: false,
                    isVideoMuted: false,
                    stream: null,
                  },
                ];
              });

              // Existing client initiates WebRTC offer to new participant
              const pc = createPeerConnection(newClientId, newName);
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSocketMessage({
                  type: "offer",
                  target: newClientId,
                  sdp: offer,
                });
              } catch (e) {
                console.warn("Failed creating WebRTC offer:", e);
              }
            }
            break;
          }

          case "participant-left":
          case "user-left": {
            const leftClientId = data.clientId || data.client_id;
            if (leftClientId) {
              if (peerConnections.current.has(leftClientId)) {
                peerConnections.current.get(leftClientId)?.close();
                peerConnections.current.delete(leftClientId);
              }
              setRemoteParticipants((prev) =>
                prev.filter((p) => p.clientId !== leftClientId)
              );
            }
            break;
          }

          case "offer": {
            const senderId = data.from;
            const senderName = data.senderName || "Participant";
            const pc = createPeerConnection(senderId, senderName);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSocketMessage({
                type: "answer",
                target: senderId,
                sdp: answer,
              });
            } catch (e) {
              console.warn("Failed answering WebRTC offer:", e);
            }
            break;
          }

          case "answer": {
            const senderId = data.from;
            const pc = peerConnections.current.get(senderId);
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              } catch (e) {
                console.warn("Failed setting remote description for answer:", e);
              }
            }
            break;
          }

          case "ice-candidate": {
            const senderId = data.from;
            const pc = peerConnections.current.get(senderId);
            if (pc && data.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.warn("Error adding ICE candidate:", e);
              }
            }
            break;
          }

          case "chat-message": {
            // If message was already appended locally via optimistic update, skip duplicate
            if (data.id && sentMessageIdsRef.current.has(data.id)) {
              return;
            }
            if (data.senderId === clientId) {
              return;
            }

            setMessages((prev) => [
              ...prev,
              {
                id: data.id || `${data.senderId}-${Date.now()}`,
                senderId: data.senderId,
                senderName: data.senderName || "Participant",
                text: data.text,
                timestamp: data.timestamp || new Date().toISOString(),
                isSelf: false,
              },
            ]);
            break;
          }

          case "media-state": {
            const targetId = data.clientId || data.client_id;
            setRemoteParticipants((prev) =>
              prev.map((p) =>
                p.clientId === targetId
                  ? {
                      ...p,
                      isAudioMuted: data.isAudioMuted,
                      isVideoMuted: data.isVideoMuted,
                    }
                  : p
              )
            );
            break;
          }

          case "screen-share-state": {
            const targetId = data.clientId || data.client_id;
            const isSharing = !!data.isSharing;
            setRemoteParticipants((prev) =>
              prev.map((p) =>
                p.clientId === targetId
                  ? { ...p, isScreenSharing: isSharing }
                  : p
              )
            );
            break;
          }

          case "reaction": {
            const emoji = data.emoji;
            const senderId = data.clientId || data.client_id;
            const reactId = Date.now();

            if (emoji === "✋") {
              const key = senderId === clientId ? "local" : senderId;
              setHandRaisedMap((prev) => ({
                ...prev,
                [key]: !prev[key],
              }));
            } else {
              const key = senderId === clientId ? "local" : senderId;
              setReactions((prev) => ({ ...prev, [key]: { emoji, id: reactId } }));
              setTimeout(() => {
                setReactions((prev) => {
                  if (prev[key]?.id === reactId) {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  }
                  return prev;
                });
              }, 3000);
            }
            break;
          }

          case "host-muted-you":
          case "host-muted-all": {
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false;
              });
            }
            setIsAudioMuted(true);
            sendSocketMessage({
              type: "media-state",
              clientId,
              isAudioMuted: true,
              isVideoMuted: isVideoMuted,
            });
            break;
          }

          case "host-removed-you": {
            if (onKickedRef.current) {
              onKickedRef.current(data.reason || "You were removed by host.");
            }
            break;
          }

          case "meeting-ended": {
            if (onMeetingEndedRef.current) {
              onMeetingEndedRef.current(data.reason || "The host ended the meeting.");
            }
            break;
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      // Stop screen share if open on cleanup
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        screenStreamRef.current = null;
      }
    };
  }, [meetingCode, clientId, createPeerConnection, sendSocketMessage]);

  // 4. Toggle Audio Mute
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !isAudioMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsAudioMuted(newMuted);
    sendSocketMessage({
      type: "media-state",
      clientId,
      isAudioMuted: newMuted,
      isVideoMuted,
    });
  }, [isAudioMuted, isVideoMuted, clientId, sendSocketMessage]);

  // 5. Toggle Video Mute
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newMuted = !isVideoMuted;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsVideoMuted(newMuted);
    sendSocketMessage({
      type: "media-state",
      clientId,
      isAudioMuted,
      isVideoMuted: newMuted,
    });
  }, [isAudioMuted, isVideoMuted, clientId, sendSocketMessage]);

  // 6. Stop Screen Share explicitly
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    // Revert WebRTC peer connections back to camera stream track
    if (localStreamRef.current) {
      const camVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (camVideoTrack) {
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(camVideoTrack).catch(() => {});
          }
        });
      }
    }
    sendSocketMessage({ type: "screen-share-state", clientId, isSharing: false });
  }, [clientId, sendSocketMessage]);

  // Start Screen Share explicitly
  const startScreenShare = useCallback(async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as any,
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
      }

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      const screenVideoTrack = stream.getVideoTracks()[0];

      // Replace track or add track in all existing peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && screenVideoTrack) {
          sender.replaceTrack(screenVideoTrack).catch(() => {});
        } else if (screenVideoTrack) {
          try {
            pc.addTrack(screenVideoTrack, stream);
          } catch {}
        }
      });

      // Browser native "Stop Sharing" floating banner callback
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      sendSocketMessage({ type: "screen-share-state", clientId, isSharing: true });
    } catch (err) {
      console.warn("Screen share cancelled or not allowed:", err);
    }
  }, [clientId, sendSocketMessage, stopScreenShare]);

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing || screenStreamRef.current) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, stopScreenShare, startScreenShare]);

  // 7. Toggle Recording (In-browser recording with auto-download)
  const toggleRecording = useCallback(() => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const streamToRecord = screenStreamRef.current || localStreamRef.current;
        if (!streamToRecord) {
          alert("No video/audio stream available to record.");
          return;
        }

        recordedChunksRef.current = [];
        const options = { mimeType: "video/webm;codecs=vp9,opus" };
        let recorder: MediaRecorder;

        try {
          recorder = new MediaRecorder(streamToRecord, options);
        } catch {
          recorder = new MediaRecorder(streamToRecord);
        }

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `zoom-meeting-${meetingCode}-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err: any) {
        console.error("Failed to start recording:", err);
        alert("Failed to start recording: " + err.message);
      }
    }
  }, [isRecording, meetingCode]);

  // 8. Send Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      sendSocketMessage({
        type: "reaction",
        clientId,
        emoji,
        timestamp: new Date().toISOString(),
      });
    },
    [clientId, sendSocketMessage]
  );

  // 9. Toggle Hand Raise
  const toggleHandRaise = useCallback(() => {
    sendSocketMessage({
      type: "reaction",
      clientId,
      emoji: "✋",
      timestamp: new Date().toISOString(),
    });
  }, [clientId, sendSocketMessage]);

  // 10. Send Chat Message (WITH OPTIMISTIC LOCAL UPDATE)
  const sendMessage = useCallback(
    (text: string) => {
      const msgId = `${clientId}-${Date.now()}`;
      sentMessageIdsRef.current.add(msgId);

      // Optimistically append message immediately to local state so it appears in chat inbox
      const localMsg: ChatMessage = {
        id: msgId,
        senderId: clientId,
        senderName: displayNameRef.current || "You",
        text,
        timestamp: new Date().toISOString(),
        isSelf: true,
      };

      setMessages((prev) => [...prev, localMsg]);

      // Broadcast to meeting peers
      sendSocketMessage({
        type: "chat-message",
        id: msgId,
        senderId: clientId,
        senderName: displayNameRef.current || "Participant",
        text,
        timestamp: localMsg.timestamp,
      });
    },
    [clientId, sendSocketMessage]
  );

  // 11. Host moderation controls
  const hostMuteAll = useCallback(() => {
    sendSocketMessage({ type: "host-mute-all" });
  }, [sendSocketMessage]);

  const hostMuteUser = useCallback(
    (targetClientId: string) => {
      sendSocketMessage({ type: "host-mute-user", target: targetClientId });
    },
    [sendSocketMessage]
  );

  const hostRemoveUser = useCallback(
    (targetClientId: string) => {
      sendSocketMessage({ type: "host-remove-user", target: targetClientId });
    },
    [sendSocketMessage]
  );

  const endMeetingForAll = useCallback(() => {
    sendSocketMessage({ type: "end-meeting" });
  }, [sendSocketMessage]);

  return {
    localStream,
    isAudioMuted,
    isVideoMuted,
    screenStream,
    isScreenSharing,
    isRecording,
    remoteParticipants,
    messages,
    reactions,
    handRaisedMap,
    isConnected,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
    toggleRecording,
    sendReaction,
    toggleHandRaise,
    sendMessage,
    hostMuteAll,
    hostMuteUser,
    hostRemoveUser,
    endMeetingForAll,
  };
}
