from datetime import datetime, timezone, timedelta
from schemas.analytics_models import TaskRecord, TaskStatusEnum, TaskPriorityEnum
from processors.metrics_calculator import (
    calculate_project_health,
    calculate_workload,
    calculate_cycle_time,
    calculate_delivery_performance
)

def test_project_health_calculation():
    now = datetime.now(timezone.utc)
    tasks = [
        TaskRecord(
            id="t1",
            project_id="p1",
            organization_id="org1",
            title="Setup database",
            status=TaskStatusEnum.DONE,
            priority=TaskPriorityEnum.HIGH,
            estimated_hours=4.0,
            actual_hours=3.5,
            reporter_id="u1",
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1)
        ),
        TaskRecord(
            id="t2",
            project_id="p1",
            organization_id="org1",
            title="Build auth API",
            status=TaskStatusEnum.IN_PROGRESS,
            priority=TaskPriorityEnum.URGENT,
            due_date=now - timedelta(days=1), # overdue
            estimated_hours=8.0,
            actual_hours=6.0,
            reporter_id="u1",
            created_at=now - timedelta(days=3),
            updated_at=now
        ),
        TaskRecord(
            id="t3",
            project_id="p1",
            organization_id="org1",
            title="Deploy to staging",
            status=TaskStatusEnum.BLOCKED,
            priority=TaskPriorityEnum.MEDIUM,
            estimated_hours=2.0,
            actual_hours=1.0,
            reporter_id="u1",
            created_at=now - timedelta(days=1),
            updated_at=now
        )
    ]

    result = calculate_project_health("p1", "org1", tasks)
    assert result.total_tasks == 3
    assert result.completed_tasks == 1
    assert result.in_progress_tasks == 1
    assert result.blocked_tasks == 1
    assert result.overdue_tasks == 1
    assert result.completion_rate_percent == 33.33
    assert result.total_estimated_hours == 14.0
    assert result.total_actual_hours == 10.5
    assert result.health_score < 100.0

def test_workload_calculation():
    now = datetime.now(timezone.utc)
    tasks = [
        TaskRecord(
            id="t1",
            project_id="p1",
            organization_id="org1",
            title="Frontend UI",
            status=TaskStatusEnum.IN_PROGRESS,
            assignee_id="u-alice",
            assignee_name="Alice Smith",
            estimated_hours=20.0,
            actual_hours=10.0,
            reporter_id="u1",
            created_at=now,
            updated_at=now
        ),
        TaskRecord(
            id="t2",
            project_id="p1",
            organization_id="org1",
            title="Backend API",
            status=TaskStatusEnum.DONE,
            assignee_id="u-bob",
            assignee_name="Bob Jones",
            estimated_hours=30.0,
            actual_hours=28.0,
            reporter_id="u1",
            created_at=now,
            updated_at=now
        ),
        TaskRecord(
            id="t3",
            project_id="p1",
            organization_id="org1",
            title="Unassigned work",
            status=TaskStatusEnum.TODO,
            assignee_id=None,
            reporter_id="u1",
            created_at=now,
            updated_at=now
        )
    ]

    workload = calculate_workload("org1", tasks)
    assert workload.unassigned_tasks_count == 1
    assert len(workload.members) == 2

    alice_stat = next(m for m in workload.members if m.assignee_id == "u-alice")
    assert alice_stat.total_tasks == 1
    assert alice_stat.open_tasks == 1
    assert alice_stat.total_estimated_hours == 20.0
    assert alice_stat.utilization_rate_percent == 50.0

def test_cycle_time_calculation():
    now = datetime.now(timezone.utc)
    tasks = [
        TaskRecord(
            id="t1",
            project_id="p1",
            organization_id="org1",
            title="Task 1",
            status=TaskStatusEnum.DONE,
            priority=TaskPriorityEnum.HIGH,
            reporter_id="u1",
            created_at=now - timedelta(hours=10),
            updated_at=now # cycle time ~ 10 hours
        ),
        TaskRecord(
            id="t2",
            project_id="p1",
            organization_id="org1",
            title="Task 2",
            status=TaskStatusEnum.DONE,
            priority=TaskPriorityEnum.LOW,
            reporter_id="u1",
            created_at=now - timedelta(hours=20),
            updated_at=now # cycle time ~ 20 hours
        )
    ]

    cycle = calculate_cycle_time("org1", tasks)
    assert cycle.completed_tasks_sample_size == 2
    assert cycle.average_cycle_time_hours == 15.0
    assert cycle.min_cycle_time_hours == 10.0
    assert cycle.max_cycle_time_hours == 20.0
    assert "HIGH" in cycle.priority_breakdown
    assert "LOW" in cycle.priority_breakdown
