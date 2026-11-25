from datetime import datetime, timezone, timedelta
from processors.stream_processor import StreamProcessor
import json

def test_stream_csv_chunks():
    records = [
        {"id": "1", "title": "First task", "status": "DONE", "hours": 4.5},
        {"id": "2", "title": "Second task", "status": "TODO", "hours": 2.0},
        {"id": "3", "title": "Third task", "status": "IN_PROGRESS", "hours": 8.0}
    ]
    fieldnames = ["id", "title", "status", "hours"]
    chunks = list(StreamProcessor.stream_csv_chunks(records, fieldnames, chunk_size=2))

    assert len(chunks) >= 2
    full_csv = "".join(chunks)
    assert "id,title,status,hours" in full_csv
    assert "First task" in full_csv
    assert "Third task" in full_csv

def test_stream_json_chunks():
    records = [
        {"id": "1", "title": "First"},
        {"id": "2", "title": "Second"}
    ]
    chunks = list(StreamProcessor.stream_json_chunks(records, chunk_size=1))
    full_json_str = "".join(chunks)
    parsed = json.loads(full_json_str)
    assert len(parsed) == 2
    assert parsed[0]["title"] == "First"

def test_filter_overdue_tasks_stream():
    now = datetime.now(timezone.utc)
    tasks = [
        {"id": "1", "status": "DONE", "due_date": (now - timedelta(days=5)).isoformat()}, # done so not overdue
        {"id": "2", "status": "IN_PROGRESS", "due_date": (now - timedelta(days=2)).isoformat()}, # overdue!
        {"id": "3", "status": "TODO", "due_date": (now + timedelta(days=3)).isoformat()} # future, not overdue
    ]

    overdue = list(StreamProcessor.filter_overdue_tasks_stream(tasks, now=now))
    assert len(overdue) == 1
    assert overdue[0]["id"] == "2"
    assert overdue[0]["overdue_days"] >= 1.9

def test_aggregate_productivity_stream():
    tasks = [
        {"id": "1", "status": "DONE", "estimated_hours": 5.0, "actual_hours": 4.0, "assignee_id": "u1"},
        {"id": "2", "status": "TODO", "estimated_hours": 10.0, "actual_hours": 2.0, "assignee_id": "u1"},
        {"id": "3", "status": "DONE", "estimated_hours": 3.0, "actual_hours": 3.0, "assignee_id": "u2"}
    ]

    agg = StreamProcessor.aggregate_productivity_stream(tasks)
    assert agg["total_tasks_processed"] == 3
    assert agg["completed_tasks"] == 2
    assert agg["completion_rate_percent"] == 66.67
    assert agg["total_estimated_hours"] == 18.0
    assert agg["total_actual_hours"] == 9.0
    assert agg["user_task_counts"]["u1"] == 2
    assert agg["user_task_counts"]["u2"] == 1
