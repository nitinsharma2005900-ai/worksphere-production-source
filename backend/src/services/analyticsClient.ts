import { env } from '../config/env';
import { logger } from '../config/logger';

export class AnalyticsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.ANALYTICS_SERVICE_URL;
    this.apiKey = env.ANALYTICS_INTERNAL_API_KEY;
  }

  private async post(endpoint: string, body: any) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.apiKey
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analytics service error [${response.status}]: ${errorText}`);
      }

      return await response.json();
    } catch (err: any) {
      logger.error({ err, endpoint }, 'Error calling FastAPI analytics service');
      throw err;
    }
  }

  async getProjectHealth(organizationId: string, projectId: string, tasks: any[]) {
    return this.post('/api/v1/analytics/project-health', {
      organization_id: organizationId,
      project_id: projectId,
      tasks
    });
  }

  async getWorkload(organizationId: string, tasks: any[]) {
    return this.post('/api/v1/analytics/workload', {
      organization_id: organizationId,
      tasks
    });
  }

  async getCycleTime(organizationId: string, tasks: any[]) {
    return this.post('/api/v1/analytics/cycle-time', {
      organization_id: organizationId,
      tasks
    });
  }

  async getDeliveryPerformance(organizationId: string, tasks: any[]) {
    return this.post('/api/v1/analytics/delivery', {
      organization_id: organizationId,
      tasks
    });
  }
}

export const analyticsClient = new AnalyticsClient();
