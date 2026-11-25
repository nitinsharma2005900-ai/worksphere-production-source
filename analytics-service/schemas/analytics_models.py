from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TaskStatusEnum(str, Enum):
    BACKLOG = "BACKLOG"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    BLOCKED = "BLOCKED"

class TaskPriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

class TaskRecord(BaseModel):
    id: str
    project_id: str
    organization_id: str
    title: str
    status: TaskStatusEnum
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = 0.0
    actual_hours: Optional[float] = 0.0
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_id: str
    version: int = 1
    created_at: datetime
    updated_at: datetime

class ActivityRecord(BaseModel):
    id: str
    organization_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = {}
    created_at: datetime

class ProjectHealthRequest(BaseModel):
    organization_id: str
    project_id: str
    tasks: List[TaskRecord]

class ProjectHealthResponse(BaseModel):
    project_id: str
    organization_id: str
    health_score: float = Field(..., description="Calculated health score between 0.0 and 100.0")
    health_status: str = Field(..., description="EXCELLENT, GOOD, AT_RISK, or CRITICAL")
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    blocked_tasks: int
    overdue_tasks: int
    completion_rate_percent: float
    total_estimated_hours: float
    total_actual_hours: float
    hour_variance: float

class WorkloadMemberStat(BaseModel):
    assignee_id: str
    assignee_name: str
    total_tasks: int
    completed_tasks: int
    open_tasks: int
    blocked_tasks: int
    total_estimated_hours: float
    total_actual_hours: float
    utilization_rate_percent: float

class WorkloadRequest(BaseModel):
    organization_id: str
    tasks: List[TaskRecord]

class WorkloadResponse(BaseModel):
    organization_id: str
    members: List[WorkloadMemberStat]
    unassigned_tasks_count: int

class CycleTimeMetric(BaseModel):
    task_id: str
    title: str
    priority: str
    cycle_time_hours: float

class CycleTimeRequest(BaseModel):
    organization_id: str
    tasks: List[TaskRecord]

class CycleTimeResponse(BaseModel):
    organization_id: str
    average_cycle_time_hours: float
    median_cycle_time_hours: float
    min_cycle_time_hours: float
    max_cycle_time_hours: float
    priority_breakdown: Dict[str, float]
    completed_tasks_sample_size: int

class DeliveryPerformanceRequest(BaseModel):
    organization_id: str
    tasks: List[TaskRecord]

class DeliveryPerformanceResponse(BaseModel):
    organization_id: str
    on_time_delivery_rate_percent: float
    on_time_tasks_count: int
    late_tasks_count: int
    open_overdue_count: int
    average_delay_days: float

class ExportFormat(str, Enum):
    CSV = "csv"
    JSON = "json"

class ExportStreamRequest(BaseModel):
    organization_id: str
    format: ExportFormat = ExportFormat.CSV
    records: List[Dict[str, Any]]
