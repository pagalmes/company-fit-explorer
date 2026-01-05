"""
Async database connection pool management.
"""
import asyncpg
from config.settings import DATABASE_CONFIG
import logging

logger = logging.getLogger(__name__)


class DatabasePool:
    """
    Manages an asyncpg connection pool for the application.
    
    This class implements a singleton pattern to ensure only one
    connection pool exists throughout the application lifecycle.
    """
    
    _instance = None
    _pool = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabasePool, cls).__new__(cls)
        return cls._instance
    
    async def initialize(self):
        """
        Initialize the connection pool.
        
        Should be called once at application startup.
        """
        if self._pool is None:
            try:
                self._pool = await asyncpg.create_pool(
                    host=DATABASE_CONFIG["host"],
                    port=DATABASE_CONFIG["port"],
                    database=DATABASE_CONFIG["database"],
                    user=DATABASE_CONFIG["user"],
                    password=DATABASE_CONFIG["password"],
                    min_size=DATABASE_CONFIG["min_size"],
                    max_size=DATABASE_CONFIG["max_size"],
                    command_timeout=60,
                )
                logger.info(
                    f"Database pool initialized with "
                    f"{DATABASE_CONFIG['min_size']}-{DATABASE_CONFIG['max_size']} connections"
                )
            except Exception as e:
                logger.error(f"Failed to initialize database pool: {e}")
                raise
    
    async def close(self):
        """
        Close the connection pool.
        
        Should be called at application shutdown.
        """
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            logger.info("Database pool closed")
    
    def get_pool(self) -> asyncpg.Pool:
        """
        Get the connection pool instance.
        
        Returns:
            asyncpg.Pool: The connection pool
            
        Raises:
            RuntimeError: If pool is not initialized
        """
        if self._pool is None:
            raise RuntimeError(
                "Database pool not initialized. Call initialize() first."
            )
        return self._pool
    
    async def acquire(self):
        """
        Acquire a connection from the pool.
        
        Returns:
            asyncpg.Connection: A database connection
        """
        pool = self.get_pool()
        return await pool.acquire()
    
    async def release(self, connection):
        """
        Release a connection back to the pool.
        
        Args:
            connection: The connection to release
        """
        pool = self.get_pool()
        await pool.release(connection)
    
    async def execute(self, query: str, *args):
        """
        Execute a query using a connection from the pool.
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            
        Returns:
            Query result
        """
        pool = self.get_pool()
        async with pool.acquire() as conn:
            return await conn.execute(query, *args)
    
    async def fetch(self, query: str, *args):
        """
        Fetch multiple rows using a connection from the pool.
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            
        Returns:
            List of records
        """
        pool = self.get_pool()
        async with pool.acquire() as conn:
            return await conn.fetch(query, *args)
    
    async def fetchrow(self, query: str, *args):
        """
        Fetch a single row using a connection from the pool.
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            
        Returns:
            Single record or None
        """
        pool = self.get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchrow(query, *args)
    
    async def fetchval(self, query: str, *args):
        """
        Fetch a single value using a connection from the pool.
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            
        Returns:
            Single value or None
        """
        pool = self.get_pool()
        async with pool.acquire() as conn:
            return await conn.fetchval(query, *args)


# Global database pool instance
db_pool = DatabasePool()


