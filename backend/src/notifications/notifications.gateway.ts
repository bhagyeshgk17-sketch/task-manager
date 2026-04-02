import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface NotificationPayload {
  type: string;
  message: string;
  taskId?: string;
  taskTitle?: string;
  count?: number;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:4200',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(socket: Socket): void {
    const token =
      (socket.handshake.auth as { token?: string })?.token ||
      (socket.handshake.query as { token?: string })?.token;

    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const userId = payload.sub;
      socket.join(`user_${userId}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(_socket: Socket): void {
    // cleanup handled automatically by socket.io room management
  }

  sendNotification(userId: string, payload: NotificationPayload): void {
    this.server.to(`user_${userId}`).emit('notification', {
      ...payload,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
  }
}
