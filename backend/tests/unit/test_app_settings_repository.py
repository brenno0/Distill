from app.db.app_settings_repository import AppSettingsRepository


class _FakeQuery:
    def __init__(self, result_data):
        self.result_data = result_data

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        return type("Result", (), {"data": self.result_data})()


class _FakeTable:
    def __init__(self):
        self.rows = [{"id": True, "default_llm_provider": "gemini", "default_llm_model": "gemini-2.5-flash"}]
        self.last_upsert = None

    def select(self, *_args, **_kwargs):
        return _FakeQuery(self.rows)

    def upsert(self, payload):
        self.last_upsert = payload
        self.rows = [payload]
        return _FakeQuery([payload])


class _FakeDb:
    def __init__(self):
        self.table_ref = _FakeTable()

    def table(self, _name):
        return self.table_ref


async def test_get_returns_none_without_db():
    repo = AppSettingsRepository()
    repo._db = None
    assert await repo.get() is None


async def test_get_returns_record_when_db_is_available():
    repo = AppSettingsRepository()
    repo._db = _FakeDb()
    record = await repo.get()
    assert record is not None
    assert record["default_llm_provider"] == "gemini"


async def test_upsert_returns_payload_without_db():
    repo = AppSettingsRepository()
    repo._db = None
    record = await repo.upsert(provider="openai", model="gpt-4o-mini")
    assert record["default_llm_provider"] == "openai"
    assert record["default_llm_model"] == "gpt-4o-mini"


async def test_upsert_persists_using_db_client():
    repo = AppSettingsRepository()
    fake_db = _FakeDb()
    repo._db = fake_db

    record = await repo.upsert(provider="anthropic", model="claude-sonnet-4-6")
    assert fake_db.table_ref.last_upsert["default_llm_provider"] == "anthropic"
    assert record["default_llm_model"] == "claude-sonnet-4-6"
