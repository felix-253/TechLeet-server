from dotenv import load_dotenv
import os
from langchain_community.utilities import SQLDatabase
from langchain_community.tools.sql_database.tool import QuerySQLDatabaseTool
from langgraph.checkpoint.redis import RedisSaver
from pinecone import Pinecone

load_dotenv()

class PostgresDatabase:
    def __init__(self):
        self._url = os.getenv("DATABASE_URL")
        if not self._url:
            raise ValueError("DATABASE_URL is not set in environment variables")
        
        try:
            self._postgres = SQLDatabase.from_uri(self._url)
        except Exception as e:
            raise RuntimeError(f"Failed to connect to database: {e}")
        
        self._run = QuerySQLDatabaseTool(
            db=self._postgres,
            description="Use this tool to query the database"
        )

    def get_db(self):
        return self._postgres

    def run(self, query: str,) -> str:
        try:
            return self._run.invoke(query)
        except Exception as e:
            return f"❌ Lỗi khi thực thi truy vấn: {e}"


class RedisDatabase:
    def __init__(self):
        self._redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._saver = None

    def connect(self):
        if not self._saver:
            self._saver = RedisSaver.from_conn_string(self._redis_url).__enter__()
            
            self._saver.setup()
        return self._saver
    
    def delete_by_thread(self, thread_id: str):
        prefixes = ["checkpoint:", "checkpoint_blob:", "checkpoint_write:"]
        for prefix in prefixes:
            key = f"{prefix}{thread_id}"
            self._redis.delete(key)

    def close(self):
        if self._saver:
            self._saver.__exit__(None, None, None)
            self._saver = None

class PineconeDatabase:
    def __init__(self):
        self._api_key = os.getenv("PINECONE_API_KEY")
        self._pc = Pinecone(api_key=self._api_key)
        self._index_name = "climbing-rose-index"

    def get_index(self):
        
        return self._index
    
# def test_connection():
#     db = PostgresDatabase().get_db()
#     query = "SELECT * FROM paintings LIMIT 5;"
#     result = db.run(query)
#     print("✅ Kết nối thành công! Dữ liệu từ database:")
#     print(result)

# if __name__ == "__main__":
#     test_connection()