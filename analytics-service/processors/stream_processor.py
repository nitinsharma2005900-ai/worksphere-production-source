import csv
import io
import json
from datetime import datetime, timezone
from typing import Iterator, Dict, Any, Iterable, Tuple, Optional

class StreamProcessor:
    """
    Assessment 05: Reusable streaming processor that processes massive collections of
    tasks and activity logs in chunks without loading entire datasets into memory.
    """

    @staticmethod
    def stream_csv_chunks(records_iter: Iterable[Dict[str, Any]], fieldnames: list, chunk_size: int = 500) -> Iterator[str]:
        """
        Yields CSV text in bounded memory chunks.
        """
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        count = 0
        for record in records_iter:
            # Flatten or stringify complex fields
            row = {}
            for f in fieldnames:
                val = record.get(f, "")
                if isinstance(val, (dict, list)):
                    row[f] = json.dumps(val)
                elif isinstance(val, datetime):
                    row[f] = val.isoformat()
                else:
                    row[f] = val
            writer.writerow(row)
            count += 1
            if count >= chunk_size:
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)
                count = 0

        if output.tell() > 0:
            yield output.getvalue()

    @staticmethod
    def stream_json_chunks(records_iter: Iterable[Dict[str, Any]], chunk_size: int = 500) -> Iterator[str]:
        """
        Yields JSON formatted array chunks with constant memory.
        """
        yield "[\n"
        first = True
        batch = []

        for record in records_iter:
            clean_rec = {}
            for k, v in record.items():
                if isinstance(v, datetime):
                    clean_rec[k] = v.isoformat()
                else:
                    clean_rec[k] = v

            batch.append(json.dumps(clean_rec))
            if len(batch) >= chunk_size:
                chunk_str = ""
                for item in batch:
                    if not first:
                        chunk_str += ",\n"
                    else:
                        first = False
                    chunk_str += "  " + item
                yield chunk_str
                batch = []

        if batch:
            chunk_str = ""
            for item in batch:
                if not first:
                    chunk_str += ",\n"
                else:
                    first = False
                chunk_str += "  " + item
            yield chunk_str

        yield "\n]"

    @staticmethod
    def filter_overdue_tasks_stream(tasks_iter: Iterable[Dict[str, Any]], now: Optional[datetime] = None) -> Iterator[Dict[str, Any]]:
        """
        Generator yielding only overdue open tasks in a streaming pipeline.
        """
        if now is None:
            now = datetime.now(timezone.utc)

        for task in tasks_iter:
            status = task.get("status", "")
            if status == "DONE":
                continue

            due_date = task.get("due_date")
            if not due_date:
                continue

            if isinstance(due_date, str):
                try:
                    due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                except Exception:
                    continue

            if not due_date.tzinfo:
                due_date = due_date.replace(tzinfo=timezone.utc)

            if due_date < now:
                overdue_days = round((now - due_date).total_seconds() / 86400.0, 2)
                enriched = dict(task)
                enriched["overdue_days"] = overdue_days
                yield enriched

    @staticmethod
    def aggregate_productivity_stream(tasks_iter: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Streaming accumulator: maintains O(1) memory space while processing arbitrary stream lengths.
        """
        total_count = 0
        completed_count = 0
        total_est_hours = 0.0
        total_act_hours = 0.0
        user_tasks: Dict[str, int] = {}
        priority_counts: Dict[str, int] = {}

        for task in tasks_iter:
            total_count += 1
            if task.get("status") == "DONE":
                completed_count += 1

            est = float(task.get("estimated_hours") or 0.0)
            act = float(task.get("actual_hours") or 0.0)
            total_est_hours += est
            total_act_hours += act

            uid = str(task.get("assignee_id") or "unassigned")
            user_tasks[uid] = user_tasks.get(uid, 0) + 1

            prio = str(task.get("priority") or "MEDIUM")
            priority_counts[prio] = priority_counts.get(prio, 0) + 1

        completion_rate = round((completed_count / total_count * 100.0), 2) if total_count > 0 else 0.0

        return {
            "total_tasks_processed": total_count,
            "completed_tasks": completed_count,
            "completion_rate_percent": completion_rate,
            "total_estimated_hours": round(total_est_hours, 2),
            "total_actual_hours": round(total_act_hours, 2),
            "hour_variance": round(total_act_hours - total_est_hours, 2),
            "user_task_counts": user_tasks,
            "priority_distribution": priority_counts
        }
