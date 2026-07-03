import asyncio
from typing import AsyncGenerator

from google.genai import types

from services.gemini import LLM_MODEL, get_client

# 嚴格模式：只根據知識庫段落回答並引用來源
GROUNDED_SYSTEM_PROMPT = """你是 EconKB 經濟學知識庫助理。請嚴格根據以下知識庫內容回答問題。

規則：
1. 只根據提供的知識庫段落回答，不要使用訓練資料中的其他知識
2. 每個重要陳述後請引用來源段落編號，格式：[來源 N]
3. 若知識庫中沒有相關資料，請明確告知「知識庫中未找到相關資料」
4. 回答使用繁體中文，清晰有條理"""

# 通用模式：知識庫無相關資料時，用 AI 通用知識回答
GENERAL_SYSTEM_PROMPT = """你是 EconKB 經濟學知識庫助理。使用者的知識庫中沒有與此問題相關的資料，請運用你的通用知識回答。

規則：
1. 用通用知識清楚、準確地回答，回答使用繁體中文、條理分明
2. **不要編造具體數據、統計或引用不存在的來源**；不確定時明說不確定
3. 若問題涉及最新數據、時事或法規，提醒使用者你的知識可能有時效限制
4. 不要加上 [來源 N] 標記（因為並非來自知識庫）"""

# 通用回答的前綴標註，讓使用者清楚區分來源
GENERAL_DISCLAIMER = "ℹ️ 此回答來自 AI 通用知識，非知識庫內容。\n\n"

_GROUNDED_CONFIG = types.GenerateContentConfig(system_instruction=GROUNDED_SYSTEM_PROMPT)
_GENERAL_CONFIG = types.GenerateContentConfig(system_instruction=GENERAL_SYSTEM_PROMPT)


async def _stream(prompt: str, config: types.GenerateContentConfig) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def _run() -> None:
        try:
            for chunk in get_client().models.generate_content_stream(
                model=LLM_MODEL, contents=prompt, config=config,
            ):
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


async def _complete(prompt: str, config: types.GenerateContentConfig) -> str:
    response = await asyncio.to_thread(
        get_client().models.generate_content, model=LLM_MODEL, contents=prompt, config=config,
    )
    return response.text or ""


# ---- 嚴格模式（有知識庫資料）----

def _grounded_prompt(question: str, context: str) -> str:
    return f"知識庫內容：\n\n{context}\n\n問題：{question}"


def stream_answer(question: str, context: str) -> AsyncGenerator[str, None]:
    return _stream(_grounded_prompt(question, context), _GROUNDED_CONFIG)


async def complete_answer(question: str, context: str) -> str:
    return await _complete(_grounded_prompt(question, context), _GROUNDED_CONFIG)


# ---- 通用模式（知識庫無相關資料）----

def stream_general(question: str) -> AsyncGenerator[str, None]:
    return _stream(question, _GENERAL_CONFIG)


async def complete_general(question: str) -> str:
    return await _complete(question, _GENERAL_CONFIG)
