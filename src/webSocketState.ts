export enum WebSocketState {
    // Connected, fully-open, ready to send and receive frames
    STATE_OPEN = 'open',
    // Received a close frame from the remote peer
    STATE_PEER_REQUESTED_CLOSE = 'peer_requested_close',
    // Sent close frame to remote peer.  No further data can be sent.
    STATE_ENDING = 'ending',
    // Connection is fully closed.  No further data can be sent or received.
    STATE_CLOSED = 'closed'
}