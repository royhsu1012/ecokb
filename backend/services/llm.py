import asyncio
from typing import AsyncGenerator

from google.genai import types

from services.gemini import LLM_MODEL, get_client

SYSTEM_PROMPT = """你是 EconKB 經濟學知識庫助理。請嚴格根據以下知識庫內容回答問題。

規則：
1. 只根據提供的知識庫段落回答，不要使用訓練資料中的其他知識
2. 每個重要陳述後請引用來源段落編號，格式：[來源 N]
3. 若知識庫中沒有相關資料，請明確告知「知識庫中未找到相關資料」
4. 回答使用繁體中文，清晰有條理"""

_CONFIG = types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT)


def _build_prompt(question: str, context: str) -> str:
    return f"知識庫內容：\n\n{context}\n\n問題：{question}"


async def stream_answer(question: str, context: str) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    prompt = _build_prompt(question, context)

    def _run() -> None:
        try:
            stream = get_client().models.generate_content_stream(
                model=LLM_MODEL, contents=prompt, config=_CONFIG,
            )
            for chunk in stream:
                if chunk.text:
                    loop.call_soon_threadsafe(queue.put_nowait, chunk.text)
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, f"錯誤：{e}")
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    loop.run_in_executor(None, _run)

    while True:
        text = await queue.get()
        if text is None:
            break
        yield text


async def complete_answer(question: str, context: str) -> str:
    response = await asyncio.to_thread(
        get_client().models.generate_content,
        model=LLM_MODEL,
        contents=_build_prompt(question, context),
        config=_CONFIG,
    )
    return response.text or ""
