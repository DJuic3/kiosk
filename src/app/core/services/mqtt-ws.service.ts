import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type MqttConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

export interface MqttMessage {
  topic: string;
  payload: string;
  at: string;
}

/** Minimal MQTT 3.1.1 client over WebSocket (no extra npm deps). */
@Injectable({ providedIn: 'root' })
export class MqttWsService {
  private socket: WebSocket | null = null;
  private packetId = 1;

  readonly state = signal<MqttConnectionState>('idle');
  readonly error = signal('');
  readonly messages$ = new Subject<MqttMessage>();
  readonly connected$ = new Subject<void>();

  connect(brokerWsUrl: string, clientId: string): void {
    this.disconnect();
    this.state.set('connecting');
    this.error.set('');

    try {
      this.socket = new WebSocket(brokerWsUrl, 'mqtt');
    } catch (err) {
      this.state.set('error');
      this.error.set(err instanceof Error ? err.message : 'Invalid broker URL');
      return;
    }

    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      this.send(this.buildConnect(clientId));
    };

    this.socket.onmessage = (event) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      this.handlePacket(data);
    };

    this.socket.onerror = () => {
      this.state.set('error');
      this.error.set('WebSocket error — is Docker Mosquitto running on port 9001?');
    };

    this.socket.onclose = () => {
      if (this.state() !== 'error') {
        this.state.set('closed');
      }
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.state.set('idle');
  }

  subscribe(topic: string): void {
    this.send(this.buildSubscribe(topic));
  }

  publish(topic: string, payload: string): void {
    this.send(this.buildPublish(topic, payload));
  }

  private handlePacket(data: Uint8Array): void {
    const type = data[0] >> 4;

    if (type === 2) {
      // CONNACK
      const code = data[3];
      if (code === 0) {
        this.state.set('connected');
        this.connected$.next();
      } else {
        this.state.set('error');
        this.error.set(`Broker rejected connection (code ${code})`);
      }
      return;
    }

    if (type === 3) {
      // PUBLISH
      let offset = 1;
      const [, remLen, lenSize] = this.readRemainingLength(data, offset);
      offset += lenSize;
      const topicLen = (data[offset] << 8) | data[offset + 1];
      offset += 2;
      const topic = new TextDecoder().decode(data.slice(offset, offset + topicLen));
      offset += topicLen;
      const qos = (data[0] & 0x06) >> 1;
      if (qos > 0) {
        offset += 2;
      }
      const payload = new TextDecoder().decode(data.slice(offset, offset + remLen - topicLen - 2 - (qos > 0 ? 2 : 0)));
      this.messages$.next({ topic, payload, at: new Date().toISOString() });
    }
  }

  private send(packet: Uint8Array): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(packet);
    }
  }

  private buildConnect(clientId: string): Uint8Array {
    const protocol = 'MQTT';
    const protoBytes = new TextEncoder().encode(protocol);
    const idBytes = new TextEncoder().encode(clientId);
    const variable =
      2 +
      protoBytes.length +
      1 +
      1 +
      2 +
      2 +
      idBytes.length;
    const payloadLen = 2 + idBytes.length;
    const remaining = variable + payloadLen;

    const buf = new Uint8Array(2 + remaining);
    let i = 0;
    buf[i++] = 0x10;
    i += this.writeRemainingLength(buf, i, remaining);
    buf[i++] = 0x00;
    buf[i++] = protoBytes.length;
    buf.set(protoBytes, i);
    i += protoBytes.length;
    buf[i++] = 0x04; // MQTT 3.1.1
    buf[i++] = 0x02; // clean session
    buf[i++] = 0x00;
    buf[i++] = 0x3c; // keep alive 60s
    buf[i++] = idBytes.length >> 8;
    buf[i++] = idBytes.length & 0xff;
    buf.set(idBytes, i);
    return buf;
  }

  private buildSubscribe(topic: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const remaining = 2 + 2 + topicBytes.length + 1;
    const buf = new Uint8Array(2 + remaining);
    let i = 0;
    buf[i++] = 0x82;
    i += this.writeRemainingLength(buf, i, remaining);
    const id = this.packetId++;
    buf[i++] = id >> 8;
    buf[i++] = id & 0xff;
    buf[i++] = topicBytes.length >> 8;
    buf[i++] = topicBytes.length & 0xff;
    buf.set(topicBytes, i);
    i += topicBytes.length;
    buf[i++] = 0x00; // QoS 0
    return buf;
  }

  private buildPublish(topic: string, payload: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const payloadBytes = new TextEncoder().encode(payload);
    const remaining = 2 + topicBytes.length + payloadBytes.length;
    const buf = new Uint8Array(2 + remaining);
    let i = 0;
    buf[i++] = 0x30; // PUBLISH QoS 0
    i += this.writeRemainingLength(buf, i, remaining);
    buf[i++] = topicBytes.length >> 8;
    buf[i++] = topicBytes.length & 0xff;
    buf.set(topicBytes, i);
    i += topicBytes.length;
    buf.set(payloadBytes, i);
    return buf;
  }

  private writeRemainingLength(buf: Uint8Array, offset: number, length: number): number {
    let pos = offset;
    let x = length;
    do {
      let encoded = x % 128;
      x = Math.floor(x / 128);
      if (x > 0) {
        encoded |= 128;
      }
      buf[pos++] = encoded;
    } while (x > 0);
    return pos - offset;
  }

  private readRemainingLength(data: Uint8Array, offset: number): [number, number, number] {
    let multiplier = 1;
    let value = 0;
    let pos = offset;
    let encoded = 0;
    do {
      encoded = data[pos++];
      value += (encoded & 127) * multiplier;
      multiplier *= 128;
    } while ((encoded & 128) !== 0);
    return [value, value, pos - offset];
  }
}
