"""切塊策略測試：遞迴語意邊界切，不切在句中、內容不遺失。"""
from services.parser import chunk_text


def test_empty_input():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_size_respected():
    text = "句子。" * 200  # 遠超 size
    chunks = chunk_text(text, size=100, overlap=20)
    # 每塊不應大幅超過 size（允許 overlap 續接）
    assert all(len(c) <= 100 + 20 for c in chunks)
    assert len(chunks) > 1


def test_chinese_sentence_boundary():
    text = "第一句話結束。第二句話也結束。第三句話同樣結束。"
    chunks = chunk_text(text, size=20, overlap=0)
    # 每塊應以句末標點結尾（不切在句中）
    assert all(c.rstrip().endswith("。") for c in chunks)


def test_content_preserved():
    text = "重貼現率調升至 2.125%。外匯存底 5782 億美元。The rate rose."
    joined = "".join(chunk_text(text, size=30, overlap=5))
    for fact in ["2.125%", "5782", "The rate rose"]:
        assert fact in joined


def test_no_midword_english():
    text = "The Committee will continue quantitative tightening as planned. " * 10
    chunks = chunk_text(text, size=120, overlap=20)
    # 英文塊結尾不應停在半個單字（結尾為標點、空白或完整詞）
    for c in chunks:
        tail = c.rstrip()
        assert tail == "" or tail[-1] in ".!? " or tail.split()[-1].isalpha()
