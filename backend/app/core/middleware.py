import logging
import time
import uuid
import sys
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configuração simples de log estruturado no console
logger = logging.getLogger("bhs_app")
logger.setLevel(logging.INFO)

# Configurar handler caso não exista
if not logger.handlers:
    handler = sys.stdout
    stream_handler = logging.StreamHandler(handler)
    formatter = logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": %(message)s}'
    )
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)


class LoggingAndCorrelationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
        
        # Injetar correlation id no escopo do request
        request.state.correlation_id = correlation_id
        
        start_time = time.perf_counter()
        metrics = request.app.state.operational_metrics
        metrics.request_started()
        
        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time
            metrics.request_finished(status_code=response.status_code, duration_seconds=duration)
            
            # Log estruturado de sucesso
            log_payload = (
                f'{{"correlation_id": "{correlation_id}", '
                f'"method": "{request.method}", '
                f'"path": "{request.url.path}", '
                f'"status_code": {response.status_code}, '
                f'"duration_seconds": {duration:.4f}}}'
            )
            logger.info(log_payload)
            
            # Adicionar Correlation ID na resposta
            response.headers["x-correlation-id"] = correlation_id
            response.headers["server-timing"] = f"app;dur={duration * 1000:.1f}"
            response.headers["x-response-time-ms"] = f"{duration * 1000:.1f}"
            return response
            
        except Exception as exc:
            duration = time.perf_counter() - start_time
            metrics.request_finished(status_code=500, duration_seconds=duration)
            log_payload = (
                f'{{"correlation_id": "{correlation_id}", '
                f'"method": "{request.method}", '
                f'"path": "{request.url.path}", '
                f'"status_code": 500, '
                f'"duration_seconds": {duration:.4f}, '
                f'"error": "{str(exc)}"}}'
            )
            logger.error(log_payload)
            raise exc


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        return response
