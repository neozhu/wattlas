from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from hashlib import sha256
import mimetypes
from pathlib import Path
import re

from grid_scope.connectors.base import CaptureRecord
from grid_scope.models import PublicationState
from grid_scope.source_catalog import SourceCatalog
from grid_scope.storage import RawCaptureStore


@dataclass(frozen=True)
class GovernedCaptureStores:
    public: RawCaptureStore
    quarantine: RawCaptureStore


@dataclass(frozen=True)
class ImportedSnapshot:
    source_id: str
    checksum: str
    observation_date: date
    source_version: str
    publication_state: PublicationState
    capture: CaptureRecord


def _media_type(path: Path) -> str:
    guessed, _ = mimetypes.guess_type(path.name)
    return guessed or "application/octet-stream"


def import_source_snapshot(
    *,
    catalog: SourceCatalog,
    source_id: str,
    input_path: Path,
    expected_checksum: str,
    observation_date: date,
    stores: GovernedCaptureStores,
    source_version: str,
) -> ImportedSnapshot:
    if re.fullmatch(r"[0-9a-f]{64}", expected_checksum) is None:
        raise ValueError("expected checksum must be a lowercase SHA-256 value")
    if not source_version.strip():
        raise ValueError("source version must be nonblank")
    source = catalog.by_id.get(source_id)
    if source is None:
        raise ValueError(f"unknown source catalogue ID: {source_id}")
    if not input_path.exists() or not input_path.is_file() or input_path.is_symlink():
        raise ValueError("manual source input must be a regular non-symlink file")
    resolved = input_path.resolve(strict=True)
    body = resolved.read_bytes()
    actual_checksum = sha256(body).hexdigest()
    if actual_checksum != expected_checksum:
        raise ValueError(
            f"manual source checksum mismatch: expected {expected_checksum}, "
            f"received {actual_checksum}"
        )

    publication_state = PublicationState(source.publication_state)
    target = (
        stores.public
        if publication_state == PublicationState.PUBLISHABLE
        else stores.quarantine
    )
    capture = target.save(source_id, body, _media_type(resolved))
    target.save_import_metadata(
        source_id=source_id,
        checksum=capture.checksum,
        observation_date=observation_date,
        source_version=source_version,
        publication_state=publication_state.value,
    )
    return ImportedSnapshot(
        source_id=source_id,
        checksum=capture.checksum,
        observation_date=observation_date,
        source_version=source_version,
        publication_state=publication_state,
        capture=capture,
    )

