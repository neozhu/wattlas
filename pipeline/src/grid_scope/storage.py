from __future__ import annotations

from datetime import UTC, date, datetime
from hashlib import sha256
import json
from pathlib import Path
from dataclasses import dataclass
import re

import duckdb

from grid_scope.connectors.base import CaptureRecord


@dataclass(frozen=True)
class StoredCapture:
    source_id: str
    checksum: str
    path: Path
    media_type: str
    retrieved_at: datetime


@dataclass(frozen=True)
class StoredImport:
    source_id: str
    checksum: str
    observation_date: date
    source_version: str
    publication_state: str
    imported_at: datetime


class RawCaptureStore:
    def __init__(self, raw_dir: Path, database_path: Path) -> None:
        self.raw_dir = raw_dir
        self.database_path = database_path
        self._assert_no_symlink_ancestors(self.raw_dir)
        self._assert_no_symlink_ancestors(self.database_path)
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._assert_no_symlink_ancestors(self.raw_dir)
        self._assert_no_symlink_ancestors(self.database_path)
        with duckdb.connect(str(self.database_path)) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS raw_captures (
                    source_id VARCHAR NOT NULL,
                    checksum VARCHAR NOT NULL,
                    path VARCHAR NOT NULL,
                    media_type VARCHAR NOT NULL,
                    retrieved_at TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY (source_id, checksum)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS source_imports (
                    source_id VARCHAR NOT NULL,
                    checksum VARCHAR NOT NULL,
                    observation_date DATE NOT NULL,
                    source_version VARCHAR NOT NULL,
                    publication_state VARCHAR NOT NULL,
                    imported_at TIMESTAMPTZ NOT NULL,
                    PRIMARY KEY (source_id, checksum)
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS canonical_assets (
                    asset_id VARCHAR PRIMARY KEY,
                    payload JSON NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """
            )

    @staticmethod
    def _assert_no_symlink_ancestors(path: Path) -> None:
        absolute = path.absolute()
        for component in (absolute, *absolute.parents):
            if component.is_symlink():
                raise ValueError(f"symlink ancestor is not allowed: {component}")

    def _assert_store_paths(self, *paths: Path) -> None:
        self._assert_no_symlink_ancestors(self.raw_dir)
        self._assert_no_symlink_ancestors(self.database_path)
        for path in paths:
            self._assert_no_symlink_ancestors(path)

    @staticmethod
    def _source_id(value: str) -> str:
        if not isinstance(value, str) or re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", value
        ) is None:
            raise ValueError("raw capture source ID must be a safe bounded slug")
        return value

    @staticmethod
    def _extension(media_type: str) -> str:
        if not isinstance(media_type, str) or not media_type.strip():
            raise ValueError("raw capture media type must be nonblank")
        return "json" if "json" in media_type.lower() else "bin"

    @staticmethod
    def _file_checksum(path: Path) -> str:
        digest = sha256()
        with path.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
        return digest.hexdigest()

    def _validated_capture(self, row: tuple[object, ...], requested: str) -> StoredCapture | None:
        source_id, checksum, raw_path, media_type, raw_retrieved_at = map(str, row)
        if source_id != requested or re.fullmatch(r"[0-9a-f]{64}", checksum) is None:
            return None
        try:
            extension = self._extension(media_type)
        except ValueError:
            return None
        expected_dir = (self.raw_dir / requested).absolute()
        expected_path = (expected_dir / f"{checksum}.{extension}").absolute()
        path = Path(raw_path).absolute()
        if path != expected_path:
            return None
        self._assert_store_paths()
        try:
            self._assert_no_symlink_ancestors(path)
        except ValueError:
            return None
        if not path.exists() or not path.is_file() or path.is_symlink():
            return None
        try:
            if self._file_checksum(path) != checksum:
                return None
            retrieved_at = datetime.fromisoformat(
                raw_retrieved_at.replace("Z", "+00:00")
            )
        except (OSError, ValueError):
            return None
        if retrieved_at.tzinfo is None:
            retrieved_at = retrieved_at.replace(tzinfo=UTC)
        return StoredCapture(
            source_id=source_id, checksum=checksum, path=path,
            media_type=media_type, retrieved_at=retrieved_at,
        )

    def save(self, source_id: str, body: bytes, media_type: str) -> CaptureRecord:
        source_id = self._source_id(source_id)
        extension = self._extension(media_type)
        checksum = sha256(body).hexdigest()
        source_dir = self.raw_dir / source_id
        path = source_dir / f"{checksum}.{extension}"
        self._assert_store_paths(source_dir, path)
        source_dir.mkdir(parents=True, exist_ok=True)
        self._assert_store_paths(source_dir, path)
        if path.exists():
            if not path.is_file() or self._file_checksum(path) != checksum:
                raise ValueError("existing raw capture does not match its content address")
        else:
            path.write_bytes(body)
        self._assert_store_paths(source_dir, path)
        with duckdb.connect(str(self.database_path)) as connection:
            connection.execute(
                """
                INSERT INTO raw_captures VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (source_id, checksum) DO UPDATE SET
                    path = excluded.path,
                    media_type = excluded.media_type,
                    retrieved_at = excluded.retrieved_at
                """,
                [source_id, checksum, str(path), media_type, datetime.now(UTC)],
            )
        return CaptureRecord(source_id, checksum, path, media_type)

    def latest_path(self, source_id: str) -> Path | None:
        capture = self.latest_capture(source_id)
        return capture.path if capture else None

    def latest_capture(self, source_id: str) -> StoredCapture | None:
        source_id = self._source_id(source_id)
        self._assert_store_paths(self.raw_dir / source_id)
        with duckdb.connect(str(self.database_path)) as connection:
            rows = connection.execute(
                """
                SELECT source_id, checksum, path, media_type,
                       CAST(retrieved_at AS VARCHAR)
                FROM raw_captures
                WHERE source_id = ?
                ORDER BY retrieved_at DESC
                """,
                [source_id],
            ).fetchall()
        self._assert_store_paths(self.raw_dir / source_id)
        for row in rows:
            capture = self._validated_capture(row, source_id)
            if capture is not None:
                return capture
        return None

    def save_import_metadata(
        self,
        *,
        source_id: str,
        checksum: str,
        observation_date: date,
        source_version: str,
        publication_state: str,
    ) -> None:
        source_id = self._source_id(source_id)
        if re.fullmatch(r"[0-9a-f]{64}", checksum) is None:
            raise ValueError("import checksum must be SHA-256")
        if not source_version.strip():
            raise ValueError("source version must be nonblank")
        if not publication_state.strip():
            raise ValueError("publication state must be nonblank")
        self._assert_store_paths()
        with duckdb.connect(str(self.database_path)) as connection:
            connection.execute(
                """
                INSERT INTO source_imports VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (source_id, checksum) DO UPDATE SET
                    observation_date = excluded.observation_date,
                    source_version = excluded.source_version,
                    publication_state = excluded.publication_state,
                    imported_at = excluded.imported_at
                """,
                [
                    source_id,
                    checksum,
                    observation_date,
                    source_version,
                    publication_state,
                    datetime.now(UTC),
                ],
            )

    def latest_import(self, source_id: str) -> StoredImport | None:
        source_id = self._source_id(source_id)
        self._assert_store_paths()
        with duckdb.connect(str(self.database_path)) as connection:
            row = connection.execute(
                """
                SELECT source_id, checksum, CAST(observation_date AS VARCHAR),
                       source_version, publication_state,
                       CAST(imported_at AS VARCHAR)
                FROM source_imports
                WHERE source_id = ?
                ORDER BY imported_at DESC
                LIMIT 1
                """,
                [source_id],
            ).fetchone()
        if row is None:
            return None
        imported_at = datetime.fromisoformat(str(row[5]).replace("Z", "+00:00"))
        if imported_at.tzinfo is None:
            imported_at = imported_at.replace(tzinfo=UTC)
        return StoredImport(
            source_id=str(row[0]),
            checksum=str(row[1]),
            observation_date=datetime.fromisoformat(str(row[2])).date(),
            source_version=str(row[3]),
            publication_state=str(row[4]),
            imported_at=imported_at,
        )

    def save_canonical_assets(self, assets: list[dict]) -> None:
        self._assert_store_paths()
        with duckdb.connect(str(self.database_path)) as connection:
            for asset in assets:
                connection.execute(
                    """
                    INSERT INTO canonical_assets VALUES (?, ?, ?)
                    ON CONFLICT (asset_id) DO UPDATE SET
                        payload = excluded.payload,
                        updated_at = excluded.updated_at
                    """,
                    [asset["id"], json.dumps(asset, separators=(",", ":")), datetime.now(UTC)],
                )

    def load_canonical_assets(self) -> list[dict]:
        self._assert_store_paths()
        with duckdb.connect(str(self.database_path)) as connection:
            rows = connection.execute(
                "SELECT payload FROM canonical_assets ORDER BY asset_id"
            ).fetchall()
        return [json.loads(row[0]) for row in rows]
