from __future__ import annotations

import hashlib
import json
import threading
from pathlib import Path
from typing import Any

_DEFAULT_DIR = Path(".cache")
_LOCK = threading.Lock()


def _path_for(namespace: str, base: Path) -> Path:
    base.mkdir(parents=True, exist_ok=True)
    return base / f"{namespace}.json"


def _load(namespace: str, base: Path) -> dict[str, Any]:
    p = _path_for(namespace, base)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save(namespace: str, data: dict[str, Any], base: Path) -> None:
    p = _path_for(namespace, base)
    tmp = p.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(p)


def key_for(*parts: str) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:32]


class DiskCache:
    def __init__(self, namespace: str, base: Path | str = _DEFAULT_DIR):
        self.namespace = namespace
        self.base = Path(base)

    def get(self, key: str) -> Any | None:
        with _LOCK:
            data = _load(self.namespace, self.base)
            return data.get(key)

    def set(self, key: str, value: Any) -> None:
        with _LOCK:
            data = _load(self.namespace, self.base)
            data[key] = value
            _save(self.namespace, data, self.base)

    def has(self, key: str) -> bool:
        return self.get(key) is not None


CACHE = DiskCache("contract_risk_explainer")