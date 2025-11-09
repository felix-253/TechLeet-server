import { Injectable } from '@nestjs/common';
import { BaseTool, ToolContext, ToolResult, ToolParameters } from './base.tool';

@Injectable()
export class NotificationTool extends BaseTool {
  name = 'notification_tool';
  description = 'Send notifications to users, manage notification history, mark notifications as read, and get unread count';

  parameters: ToolParameters = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['send', 'get_history', 'mark_read', 'get_unread_count'],
        description: 'Action to perform on notifications'
      },
      userId: {
        type: 'number',
        description: 'User ID to send notification to (required for send)'
      },
      title: {
        type: 'string',
        description: 'Notification title (required for send)'
      },
      message: {
        type: 'string',
        description: 'Notification message (required for send)'
      },
      type: {
        type: 'string',
        enum: ['info', 'success', 'warning', 'error', 'application', 'interview', 'reminder'],
        description: 'Notification type (default: info)'
      },
      link: {
        type: 'string',
        description: 'Optional link URL for the notification'
      },
      notificationId: {
        type: 'number',
        description: 'Notification ID (required for mark_read)'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying notifications',
        properties: {
          userId: { type: 'number' },
          type: { type: 'string' },
          read: { type: 'boolean' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' }
        }
      },
      limit: {
        type: 'number',
        description: 'Limit number of results (for get_history, default: 20)'
      }
    },
    required: ['action']
  };

  constructor() {
    super();
  }

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return this.createErrorResult('Invalid parameters', validation.errors.join(', '));
    }

    try {
      switch (params.action) {
        case 'send':
          return await this.sendNotification(params, context);
        case 'get_history':
          return await this.getNotificationHistory(params, context);
        case 'mark_read':
          return await this.markNotificationAsRead(params, context);
        case 'get_unread_count':
          return await this.getUnreadCount(params, context);
        default:
          return this.createErrorResult('Invalid action', `Unknown action: ${params.action}`);
      }
    } catch (error) {
      return this.createErrorResult('Execution error', error.message);
    }
  }

  private async sendNotification(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.userId || !params.title || !params.message) {
      return this.createErrorResult(
        'Missing required fields',
        'User ID, title, and message are required for sending a notification'
      );
    }

    const notification = {
      notificationId: Date.now(),
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      link: params.link || null,
      read: false,
      createdAt: new Date(),
      sentAt: new Date()
    };

    return this.createSuccessResult(
      {
        notificationId: notification.notificationId,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link,
        sentAt: notification.sentAt
      },
      `Notification sent to user ${params.userId}: "${params.title}"`
    );
  }

  private async getNotificationHistory(params: any, context: ToolContext): Promise<ToolResult> {
    const limit = params.limit || 20;
    const userId = params.filters?.userId || context.userId;

    const notifications: any[] = [];

    return this.createSuccessResult(
      {
        notifications: notifications.map((notif: any) => ({
          notificationId: notif.notificationId,
          userId: notif.userId,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          link: notif.link,
          read: notif.read,
          createdAt: notif.createdAt
        })),
        total: notifications.length,
        limit
      },
      `Retrieved ${notifications.length} notification(s)`
    );
  }

  private async markNotificationAsRead(params: any, context: ToolContext): Promise<ToolResult> {
    if (!params.notificationId) {
      return this.createErrorResult('Missing ID', 'Notification ID is required for mark_read');
    }

    return this.createSuccessResult(
      {
        notificationId: params.notificationId,
        read: true,
        readAt: new Date()
      },
      `Notification ${params.notificationId} marked as read`
    );
  }

  private async getUnreadCount(params: any, context: ToolContext): Promise<ToolResult> {
    const userId = params.filters?.userId || context.userId;

    const unreadCount = 0;

    return this.createSuccessResult(
      {
        userId,
        unreadCount,
        timestamp: new Date()
      },
      `User ${userId} has ${unreadCount} unread notification(s)`
    );
  }
}

