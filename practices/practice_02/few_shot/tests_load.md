# Нагрузочные проверки (улучшенная версия с привязкой к правилам)

| Правило | Сценарий | Нагрузка и длительность | Допустимый предел | Что измеряем | Evidence |
|---|---|---|---|---|---|
| API-1 | Поток валидных запросов | 5 RPS, 10 минут для diff ≤ 20000 | p95 латентность ≤ 3 с; 0 ошибок 5xx | Время ответа, доля ошибок | Метрики FastAPI/uvicorn; p95 ≤ 3с; 5xx=0 |
| API-1 | Пограничный размер | Серии запросов с длиной 19999, 20000, 20001 | 200 OK для ≤20000; 413 для >20000 | Корректность порога | Коды ответов 200 и 413 по сериям; порог 20000 сработал |
| SEC-1 | Инъекции секретов под нагрузкой | 1 RPS, 5 минут, входы с `ghp_ABCDEFG`, `password=secret`, PEM-блок | 0 утечек секретов в вызовы LLM | Маскирование секретов | Логи/моки LLM содержат `[REDACTED]`; отсутствуют исходные паттерны |
| REL-1 | Таймаут провайдера LLM под нагрузкой | 2 RPS, 5 минут, мок LLM с 50% ответов >10с | 504 на таймаутах; успешные ответы 200 | Устойчивость при зависаниях LLM | Коды 504 для задержек >10с; 200 для быстрых; доля 504≈50% |

## Инструмент и инфраструктура

- Инструмент: locust (Python 3.11+). Пользуемся HttpUser, TaskSet и @task для генерации запросов.
- Стенд: один инстанс FastAPI на uvicorn, один мок LLM (fastapi) с параметризуемой задержкой, locust с 1–5 пользователей и задержкой между задачами 0–1с.
- Метрики: в locust — response time/percentile; в приложении — access-логи и коды HTTP, счётчик `[REDACTED]` в промптах к LLM (на мок-эндпойнте).

Пример скелета locustfile.py:

```python
from locust import HttpUser, task, between

PAYLOAD_OK = {"diff": "x" * 20000}
PAYLOAD_TOO_LARGE = {"diff": "x" * 20001}
PAYLOAD_SECRETS = {"diff": "token ghp_ABCDEFG and password=secret and -----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----"}

class ReviewerUser(HttpUser):
    wait_time = between(0, 1)

    @task
    def valid_load(self):
        self.client.post("/api/reviews", json=PAYLOAD_OK, name="valid_20000")

    @task
    def boundary(self):
        self.client.post("/api/reviews", json=PAYLOAD_TOO_LARGE, name="too_large_20001")

    @task
    def secrets(self):
        self.client.post("/api/reviews", json=PAYLOAD_SECRETS, name="secrets_redaction")
```

Для сценария REL-1 используем мок LLM, который для части запросов спит >10с, что должно приводить к 504 на API:

```python
# Псевдокод мока LLM
# fastapi endpoint /llm: if random()<0.5: await sleep(11) else: return {"ok": True}
```

## Mermaid-схема

```mermaid
flowchart LR
    A[Client: locust] -->|"POST /api/reviews"| B[FastAPI]
    B -->|"len(diff) > 20000"| C[HTTP 413]
    B -->|"len(diff) ≤ 20000"| D[Mask secrets SEC-1]
    D --> E[Call external LLM]
    E -->|"response < 10s"| F[200 OUT-1]
    E -->|"> 10s"| G[504 timeout REL-1]
```

## Отсрочка масштабных стресс-тестов

Для MVP масштабные стресс-тесты (десятки-сотни RPS) откладываем: сервис синхронен, не включает очередь/кэш и ограничен внешним LLM. Условия старта масштабного профилирования: рост среднего трафика > 2 RPS, требования SLA p95 < 1 с, переход на асинхронную архитектуру и/или собственный LLM.

## Как использовали AI

- Для чего: привязать сценарии к правилам SEC-1/API-1/REL-1, конкретизировать Evidence и добавить инфраструктуру (locust, мок LLM) и схему.
- Тип промпта: Few-shot по образцу из experiment.md
- Строка в [`../prompts.md`](../prompts.md): Few-shot
- Что проверили и исправили сами: добавили колонку «Правило», конкретные паттерны `ghp_ABCDEFG`, `password=secret`, PEM-блок; сценарий REL-1 с 10с таймаутом; коды 200/413/504; Mermaid схему; сохранили блок об отсрочке стресс-тестов.
