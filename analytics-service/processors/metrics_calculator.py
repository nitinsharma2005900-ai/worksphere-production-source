import statistics
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from schemas.analytics_models import (
    TaskRecord,
    TaskStatusEnum,
    ProjectHealthResponse,
    WorkloadResponse,
    WorkloadMemberStat,
    CycleTimeResponse,
    DeliveryPerformanceResponse
)

def calculate_project_health(project_id: str, organization_id: str, tasks: List[TaskRecord]) -> ProjectHealthResponse:
    total = len(tasks)
    if total == 0:
        return ProjectHealthResponse(
            project_id=project_id,
            organization_id=organization_id,
            health_score=100.0,
            health_status="EXCELLENT",
            total_tasks=0,
            completed_tasks=0,
            in_progress_tasks=0,
            blocked_tasks=0,
            overdue_tasks=0,
            completion_rate_percent=100.0,
            total_estimated_hours=0.0,
            total_actual_hours=0.0,
            hour_variance=0.0
        )

    now = datetime.now(timezone.utc)
    completed = 0
    in_progress = 0
    blocked = 0
    overdue = 0
    est_hours = 0.0
    act_hours = 0.0

    for t in tasks:
        est_hours += t.estimated_hours or 0.0
        act_hours += t.actual_hours or 0.0

        if t.status == TaskStatusEnum.DONE:
            completed += 1
        elif t.status == TaskStatusEnum.BLOCKED:
            blocked += 1
        elif t.status in (TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.IN_REVIEW):
            in_progress += 1

        # Check if overdue
        if t.status != TaskStatusEnum.DONE and t.due_date:
            due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if due < now:
                overdue += 1

    completion_rate = round((completed / total) * 100.0, 2)
    hour_variance = round(act_hours - est_hours, 2)

    # Health score algorithm:
    # Starts at 100
    # Deduct:
    # - 15 points per blocked task percentage
    # - 25 points per overdue task percentage
    # - penalty if actual hours exceeds estimated by >20%
    blocked_ratio = blocked / total
    overdue_ratio = overdue / total

    score = 100.0 - (blocked_ratio * 30.0) - (overdue_ratio * 40.0)
    if est_hours > 0 and act_hours > est_hours * 1.2:
        score -= min(20.0, ((act_hours - est_hours) / est_hours) * 20.0)

    score = max(0.0, min(100.0, round(score, 1)))

    if score >= 85.0:
        status_label = "EXCELLENT"
    elif score >= 70.0:
        status_label = "GOOD"
    elif score >= 50.0:
        status_label = "AT_RISK"
    else:
        status_label = "CRITICAL"

    return ProjectHealthResponse(
        project_id=project_id,
        organization_id=organization_id,
        health_score=score,
        health_status=status_label,
        total_tasks=total,
        completed_tasks=completed,
        in_progress_tasks=in_progress,
        blocked_tasks=blocked,
        overdue_tasks=overdue,
        completion_rate_percent=completion_rate,
        total_estimated_hours=round(est_hours, 2),
        total_actual_hours=round(act_hours, 2),
        hour_variance=hour_variance
    )

def calculate_workload(organization_id: str, tasks: List[TaskRecord]) -> WorkloadResponse:
    member_map: Dict[str, Dict[str, Any]] = {}
    unassigned = 0

    for t in tasks:
        if not t.assignee_id:
            unassigned += 1
            continue

        aid = t.assignee_id
        if aid not in member_map:
            member_map[aid] = {
                "assignee_id": aid,
                "assignee_name": t.assignee_name or f"User-{aid[:8]}",
                "total_tasks": 0,
                "completed_tasks": 0,
                "open_tasks": 0,
                "blocked_tasks": 0,
                "total_estimated_hours": 0.0,
                "total_actual_hours": 0.0,
            }

        member_map[aid]["total_tasks"] += 1
        member_map[aid]["total_estimated_hours"] += t.estimated_hours or 0.0
        member_map[aid]["total_actual_hours"] += t.actual_hours or 0.0

        if t.status == TaskStatusEnum.DONE:
            member_map[aid]["completed_tasks"] += 1
        elif t.status == TaskStatusEnum.BLOCKED:
            member_map[aid]["blocked_tasks"] += 1
            member_map[aid]["open_tasks"] += 1
        else:
            member_map[aid]["open_tasks"] += 1

    stats: List[WorkloadMemberStat] = []
    for aid, m in member_map.items():
        # Standard week work capacity = 40 hours
        # Utilization rate based on active estimated hours
        utilization = min(150.0, round((m["total_estimated_hours"] / 40.0) * 100.0, 1)) if m["total_estimated_hours"] > 0 else 0.0
        stats.append(WorkloadMemberStat(
            assignee_id=aid,
            assignee_name=m["assignee_name"],
            total_tasks=m["total_tasks"],
            completed_tasks=m["completed_tasks"],
            open_tasks=m["open_tasks"],
            blocked_tasks=m["blocked_tasks"],
            total_estimated_hours=round(m["total_estimated_hours"], 2),
            total_actual_hours=round(m["total_actual_hours"], 2),
            utilization_rate_percent=utilization
        ))

    return WorkloadResponse(
        organization_id=organization_id,
        members=stats,
        unassigned_tasks_count=unassigned
    )

def calculate_cycle_time(organization_id: str, tasks: List[TaskRecord]) -> CycleTimeResponse:
    durations: List[float] = []
    by_priority: Dict[str, List[float]] = {}

    for t in tasks:
        if t.status == TaskStatusEnum.DONE:
            c_time = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            u_time = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            delta_hours = max(0.1, (u_time - c_time).total_seconds() / 3600.0)
            durations.append(delta_hours)

            p_key = t.priority.value
            if p_key not in by_priority:
                by_priority[p_key] = []
            by_priority[p_key].append(delta_hours)

    if not durations:
        return CycleTimeResponse(
            organization_id=organization_id,
            average_cycle_time_hours=0.0,
            median_cycle_time_hours=0.0,
            min_cycle_time_hours=0.0,
            max_cycle_time_hours=0.0,
            priority_breakdown={},
            completed_tasks_sample_size=0
        )

    avg_val = round(statistics.mean(durations), 2)
    median_val = round(statistics.median(durations), 2)
    min_val = round(min(durations), 2)
    max_val = round(max(durations), 2)

    breakdown = {k: round(statistics.mean(v), 2) for k, v in by_priority.items()}

    return CycleTimeResponse(
        organization_id=organization_id,
        average_cycle_time_hours=avg_val,
        median_cycle_time_hours=median_val,
        min_cycle_time_hours=min_val,
        max_cycle_time_hours=max_val,
        priority_breakdown=breakdown,
        completed_tasks_sample_size=len(durations)
    )

def calculate_delivery_performance(organization_id: str, tasks: List[TaskRecord]) -> DeliveryPerformanceResponse:
    now = datetime.now(timezone.utc)
    on_time = 0
    late = 0
    open_overdue = 0
    delay_days_list: List[float] = []

    for t in tasks:
        if not t.due_date:
            continue
        due = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)

        if t.status == TaskStatusEnum.DONE:
            updated = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            if updated <= due:
                on_time += 1
            else:
                late += 1
                delay_days = (updated - due).total_seconds() / 86400.0
                delay_days_list.append(delay_days)
        else:
            if due < now:
                open_overdue += 1
                delay_days = (now - due).total_seconds() / 86400.0
                delay_days_list.append(delay_days)

    total_evaluated = on_time + late
    delivery_rate = round((on_time / total_evaluated) * 100.0, 2) if total_evaluated > 0 else 100.0
    avg_delay = round(statistics.mean(delay_days_list), 2) if delay_days_list else 0.0

    return DeliveryPerformanceResponse(
        organization_id=organization_id,
        on_time_delivery_rate_percent=delivery_rate,
        on_time_tasks_count=on_time,
        late_tasks_count=late,
        open_overdue_count=open_overdue,
        average_delay_days=avg_delay
    )
