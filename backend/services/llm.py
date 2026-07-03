import asyncio
from typing import AsyncGenerator

from services.gemini import get_model

SYSTEM_PROMPT = """你是 EconKB 經濟學知識庫助理。請嚴格根據以下知識庫內容回答問題。

規則：
1. 只根據提供的知識庫段落回答，不要使用訓練資料中的其他知識
2. 每個重要陳述後請引用來源段落編號，格式：[來源 N]
3. 若知識庫中沒有相關資料，請明確告知「知識庫中未找到相關資料」
4. 回答使用繁體中文，清晰有條理"""


def _build_prompt(question: str, context: str) -> str:
    return f"知識庫內容：\n\n{context}\n\n問題：{question}"


async def stream_answer(question: str, context: str) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    prompt = _build_prompt(question, context)

    def _run() -> None:
        model = get_model(system_instruction=SYSTEM_PROMPT)
        try:
            for chunk in model.generate_content(prompt, stream=True):
                if chunk.parts:
                    for part in chunk.parts:
                        if hasattr(part, "text") and part.text:
                            loop.call_soon_threadsafe(queue.put_nowait, part.text)
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
    model = get_model(system_instruction=SYSTEM_PROMPT)
    response = await asyncio.to_thread(model.generate_content, _build_prompt(question, context))
    return response.text
