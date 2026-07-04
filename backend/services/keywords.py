"""知識圖譜關鍵字抽取（中英混合、$0 成本）。

混合策略：
- 預設走 Gemini（品質最佳，懂語意，會抽概念詞如「貨幣政策」「量化緊縮」）
- 當免費層 RPM 額度吃緊時，非阻塞試取失敗 → 自動降級走 jieba（統計，無 API）

jieba：中文 TF-IDF + 詞性過濾；英文 jieba 標 eng 的 token 再套停用詞。
"""
import asyncio
import json
import re

import jieba.analyse

from constants import KEYWORD_RPM_RESERVE
from services.gemini import LLM_MODEL, get_client
from services.rate_limit import generation_limiter

# 只保留有語意的詞性：名詞/地名/人名/機構名/其他專名/動名詞/英文
_ALLOW_POS = ("n", "ns", "nr", "nt", "nz", "vn", "eng")

_EN_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "then", "of", "at", "by", "for",
    "with", "about", "into", "to", "from", "in", "on", "off", "over", "under",
    "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did",
    "have", "has", "had", "will", "would", "shall", "should", "can", "could",
    "may", "might", "must", "not", "no", "nor", "so", "than", "that", "this",
    "these", "those", "there", "here", "we", "our", "us", "you", "your", "he",
    "she", "it", "its", "they", "them", "their", "his", "her", "i", "my", "me",
    "as", "up", "out", "down", "back", "well", "very", "more", "most", "much",
    "some", "any", "all", "each", "such", "only", "also", "just", "now", "since",
    "until", "while", "when", "where", "who", "what", "which", "how", "why",
    "good", "afternoon", "today", "last", "long", "way", "level", "given",
}


def jieba_keywords(text: str, top_k: int = 8) -> list[str]:
    """方案 A：jieba 統計抽取（無 API）。"""
    if not text or not text.strip():
        return []
    candidates = jieba.analyse.extract_tags(
        text, topK=top_k * 4, allowPOS=_ALLOW_POS, withWeight=False
    )
    out: list[str] = []
    for w in candidates:
        w = w.strip().strip(".,;:!?\"'()[]{}，。、！？；：（）").strip()
        if not w:
            continue
        if w.isascii():
            if w.lower() in _EN_STOPWORDS or len(w) < 3 or not any(c.isalpha() for c in w):
                continue
        elif len(w) < 2:
            continue
        if w not in out:
            out.append(w)
        if len(out) >= top_k:
            break
    return out


def _gemini_sync(text: str, top_k: int) -> list[str]:
    prompt = (
        f"從以下文件抽取最多 {top_k} 個最能代表主題的關鍵詞或概念"
        "（名詞、專有名詞、主題概念；中文用繁體、英文保留原文）。"
        '只輸出 JSON 字串陣列，例如 ["貨幣政策","聯邦基金利率","通貨膨脹"]，不要任何其他文字。\n\n'
        f"{text[:4000]}"
    )
    resp = get_client().models.generate_content(model=LLM_MODEL, contents=prompt)
    raw = (resp.text or "").strip()
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if not m:
        raise ValueError("no JSON array in response")
    arr = json.loads(m.group(0))
    return [str(x).strip() for x in arr if str(x).strip()][:top_k]


async def extract_keywords(text: str, top_k: int = 8) -> list[str]:
    """混合：RPM 充裕走 Gemini（B），吃緊或失敗降級 jieba（A）。"""
    if not text or not text.strip():
        return []
    if await generation_limiter.try_acquire(min_reserve=KEYWORD_RPM_RESERVE):
        try:
            kws = await asyncio.to_thread(_gemini_sync, text, top_k)
            if kws:
                return kws
        except Exception as e:  # noqa: BLE001
            print(f"[keywords] gemini failed, fallback to jieba: {e}")
    return await asyncio.to_thread(jieba_keywords, text, top_k)
