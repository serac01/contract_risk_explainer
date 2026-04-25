from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Clause:
    id: str
    section_title: str
    text: str
    char_start: int
    char_end: int

    @property
    def word_count(self) -> int:
        return len(self.text.split())


_HEADING_RE = re.compile(
    r"""
    (?:^|\n)
    (?P<prefix>
        (?:\s*\d+(?:\.\d+)*\.\s+)                # 1.  1.2.  3.4.5.
        | (?:\s*[A-Z][A-Z0-9 \-/&]{3,}\n)        # ALL CAPS HEADING line
        | (?:\s*Section\s+\d+[^\n]{0,80}\n)      # Section 1 Confidentiality
        | (?:\s*Article\s+[IVXLC]+[^\n]{0,80}\n) # Article II. Term
    )
    """,
    re.VERBOSE,
)


def split_text(raw: str) -> list[Clause]:
    text = _normalize(raw)
    matches = list(_HEADING_RE.finditer(text))
    if not matches:
        return _fallback_paragraph_split(text)

    clauses: list[Clause] = []
    for idx, m in enumerate(matches):
        start = m.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        if len(block) < 20:
            continue
        title, body = _extract_title_body(block)
        clauses.append(
            Clause(
                id=f"c{idx + 1:03d}",
                section_title=title,
                text=body,
                char_start=start,
                char_end=end,
            )
        )
    if not clauses:
        return _fallback_paragraph_split(text)
    return clauses


def read_pdf(pdf_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = [p.extract_text() or "" for p in reader.pages]
    text = "\n".join(pages)
    return text

def split_pdf(pdf_bytes: bytes) -> list[Clause]:
    text = read_pdf(pdf_bytes)
    return split_text(text)

def split_file(path: str | Path) -> list[Clause]:
    p = Path(path)
    if p.suffix.lower() == ".pdf":
        return split_pdf(p.read_bytes())
    return split_text(p.read_text(encoding="utf-8", errors="ignore"))


def _normalize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_title_body(block: str) -> tuple[str, str]:
    first_nl = block.find("\n")
    if first_nl == -1:
        return _truncate(block, 80), block
    first_line = block[:first_nl].strip()
    rest = block[first_nl + 1 :].strip()
    if len(first_line) <= 120 and (first_line.isupper() or re.match(r"^\s*\d", first_line) or first_line.lower().startswith(("section", "article"))):
        return _truncate(first_line, 80), rest or first_line
    return _truncate(first_line, 80), block


def _fallback_paragraph_split(text: str) -> list[Clause]:
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) >= 40]
    out: list[Clause] = []
    cursor = 0
    for idx, block in enumerate(parts):
        start = text.find(block, cursor)
        if start < 0:
            start = cursor
        end = start + len(block)
        cursor = end
        title, body = _extract_title_body(block)
        out.append(
            Clause(
                id=f"c{idx + 1:03d}",
                section_title=title,
                text=body,
                char_start=start,
                char_end=end,
            )
        )
    return out


def _truncate(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"
