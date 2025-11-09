import { Injectable } from '@nestjs/common';

export interface ToolParameters {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    enum?: string[];
    items?: { type: 'string' | 'number' | 'boolean' };
    properties?: Record<string, any>;
  }>;
  required?: string[];
}

export interface ToolContext {
  userId: number;
  sessionId: string;
  sessionContext: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

@Injectable()
export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameters;

  abstract execute(params: any, context: ToolContext): Promise<ToolResult>;

  /**
   * Get tool definition for Gemini function calling
   */
  getToolDefinition() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  /**
   * Validate parameters before execution
   */
  protected validateParameters(params: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const required = this.parameters.required || [];

    // Check required parameters
    for (const param of required) {
      if (!params || params[param] === undefined || params[param] === null) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }

    // Check parameter types
    if (params && this.parameters.properties) {
      for (const [paramName, paramDef] of Object.entries(this.parameters.properties)) {
        if (params[paramName] !== undefined) {
          const expectedType = paramDef.type;
          const actualType = typeof params[paramName];

          if (expectedType === 'array' && !Array.isArray(params[paramName])) {
            errors.push(`Parameter ${paramName} must be an array`);
          } else if (expectedType !== 'array' && actualType !== expectedType) {
            errors.push(`Parameter ${paramName} must be of type ${expectedType}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format error response
   */
  protected createErrorResult(error: string, message?: string): ToolResult {
    return {
      success: false,
      error,
      message: message || `Error executing ${this.name}: ${error}`
    };
  }

  /**
   * Format success response
   */
  protected createSuccessResult(data: any, message?: string): ToolResult {
    return {
      success: true,
      data,
      message: message || `${this.name} executed successfully`
    };
  }

  /**
   * Check if an action requires confirmation
   */
  protected requiresConfirmation(action: string, params: any): boolean {
    const destructiveActions = ['delete', 'cancel', 'reject', 'remove'];
    return destructiveActions.includes(action?.toLowerCase());
  }

  /**
   * Get confirmation message for an action
   */
  protected getConfirmationMessage(action: string, params: any): string {
    const actionMessages: { [key: string]: string } = {
      delete: `Are you sure you want to delete this ${this.name.replace('_tool', '')}?`,
      cancel: `Are you sure you want to cancel this ${this.name.replace('_tool', '')}?`,
      reject: `Are you sure you want to reject this ${this.name.replace('_tool', '')}?`,
      remove: `Are you sure you want to remove this ${this.name.replace('_tool', '')}?`
    };

    const baseMessage = actionMessages[action?.toLowerCase()] || `Are you sure you want to ${action}?`;
    
    if (params.id) {
      return `${baseMessage} (ID: ${params.id})`;
    }
    
    return baseMessage;
  }

  /**
   * Create confirmation request result
   */
  protected createConfirmationRequest(action: string, params: any, message?: string): ToolResult {
    return {
      success: false,
      error: 'confirmation_required',
      message: message || this.getConfirmationMessage(action, params),
      data: {
        requiresConfirmation: true,
        action,
        parameters: params
      }
    };
  }
}
