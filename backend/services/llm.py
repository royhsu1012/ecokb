import anthropic
from config import get_settings

_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)
    return _client


SYSTEM_PROMPT = """你是 EconKB 經濟學知識庫助理。請嚴格根據以下知識庫內容回答問題。

規則：
1. 只根據提供的知識庫段落回答，不要使用訓練資料中的其他知識
2. 每個重要陳述後請引用來源段落編號，格式：[來源 N]
3. 若知識庫中沒有相關資料，請明確告知「知識庫中未找到相關資料」
4. 回答使用繁體中文，清晰有條理"""


async def generate_answer(question: str, context: str, stream: bool = False):
    client = _get_client()
    messages = [{"role": "user", "content": f"知識庫內容：\n\n{context}\n\n問題：{question}"}]

    if stream:
        return client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
    else:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return response.content[0].text
