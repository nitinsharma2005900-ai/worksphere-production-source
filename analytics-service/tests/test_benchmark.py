from processors.benchmark import run_benchmark

def test_benchmark_execution():
    # Run benchmark on 1,000 tasks for fast automated test run
    res = run_benchmark(record_count=1000)
    assert res["status"] == "PASS"
    assert res["total_tasks_processed"] == 1000
    assert res["records_per_second"] > 100
    assert res["peak_memory_mb"] < 10.0 # Strict constant memory assertion
