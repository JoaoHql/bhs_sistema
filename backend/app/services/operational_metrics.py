import time
from collections import Counter


class OperationalMetrics:
    """Metricas leves por processo, expostas no readiness ja existente."""

    def __init__(self) -> None:
        self.started_at = time.monotonic()
        self.counters: Counter[str] = Counter()

    def request_started(self) -> None:
        self.counters["http_requests_in_flight"] += 1

    def request_finished(self, *, status_code: int, duration_seconds: float) -> None:
        self.counters["http_requests_in_flight"] = max(0, self.counters["http_requests_in_flight"] - 1)
        self.counters["http_requests_total"] += 1
        self.counters[f"http_status_{status_code}_total"] += 1
        self.counters["http_response_time_ms_total"] += round(duration_seconds * 1000)

    def snapshot(self) -> dict[str, int]:
        return {
            **dict(self.counters),
            "process_uptime_seconds": round(time.monotonic() - self.started_at),
        }
