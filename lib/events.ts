import { EventEmitter } from 'events';

// Use a global singleton to ensure events persist across serverless function invocations
// (Note: In a true serverless environment like Vercel, this might not work perfectly for scaling,
// but for a long-running server or local dev, it's fine. For production scale, use Redis Pub/Sub)
declare global {
    var notificationEmitter: EventEmitter | undefined;
}

if (!global.notificationEmitter) {
    global.notificationEmitter = new EventEmitter();
    // Increase limit if we expect many listeners, though usually it's one per client connection
    global.notificationEmitter.setMaxListeners(100);
}

export const notificationEmitter = global.notificationEmitter!;

export const EVENTS = {
    NEW_NOTIFICATION: 'NEW_NOTIFICATION',
} as const;
