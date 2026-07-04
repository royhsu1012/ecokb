"""Gemini 免費方案速率限制韌性工具。

免費層各模型約 15 RPM（每分鐘請求數，非並發數）。大文件切成數十 chunk 時，
單靠並發 Semaphore 擋不住 RPM，會在數秒內撞 429。此模組提供：

- AsyncRateLimiter：token bucket，把請求速率壓在門檻內
- with_retry：對 429 / RESOURCE_EXHAUSTED 做指數退避重試
"""
import asyncio
import time
from typing import Awaitable, Callable, TypeVar

from constants import GEMINI_RPM

T = TypeVar("T")


class AsyncRateLimiter:
    def __init__(self, rate: int, per: float = 60.0):
        self._rate = rate
        self._per = per
        self._allowance = float(rate)
        self._last = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        self._allowance = min(
            self._rate, self._allowance + (now - self._last) * (self._rate / self._per)
        )
        self._last = now

    async def acquire(self) -> None:
        async with self._lock:
            while True:
                self._refill()
                if self._allowance >= 1:
                    self._allowance -= 1
                    return
                wait = (1 - self._allowance) * (self._per / self._rate)
                await asyncio.sleep(wait)

    async def try_acquire(self, min_reserve: float = 0.0) -> bool:
        """非阻塞取用：僅在補充後餘額 > min_reserve 時消耗一個 token。

        min_reserve 用於「保留額度給高優先任務」——關鍵字抽取（低優先）可設較高的
        reserve，額度吃緊時就讓路、降級走 jieba。
        """
        async with self._lock:
            self._refill()
            if self._allowance >= 1 + min_reserve:
                self._allowance -= 1
                return True
            return False


# 每模型 RPM 上限（免費層 ~15，留緩衝）
embedding_limiter = AsyncRateLimiter(rate=GEMINI_RPM)
generation_limiter = AsyncRateLimiter(rate=GEMINI_RPM)


def _is_rate_limit(e: Exception) -> bool:
    s = str(e)
    return "429" in s or "RESOURCE_EXHAUSTED" in s or "quota" in s.lower()


async def with_retry(fn: Callable[[], Awaitable[T]], *, retries: int = 4, base: float = 2.0) -> T:
    """對 429 指數退避重試；其他例外直接拋出。"""
    for attempt in range(retries):
        try:
            return await fn()
        except Exception as e:  # noqa: BLE001
            if _is_rate_limit(e) and attempt < retries - 1:
                await asyncio.sleep(base * (2 ** attempt))
                continue
            raise
    raise RuntimeError("unreachable")
