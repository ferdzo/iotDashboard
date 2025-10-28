import logging
from typing import List
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from config import config
from schema import SensorReading
from models import SensorReading as SensorReadingModel


class DatabaseWriter:
    """
    Database writer using SQLAlchemy.
    
    Schema is defined in models.py and should be managed using Alembic migrations.
    This class only handles data insertion, NOT schema creation.
    
    To manage schema:
    1. Edit models.py to define your schema
    2. Generate migration: alembic revision --autogenerate -m "description"
    3. Apply migration: alembic upgrade head
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize SQLAlchemy engine with connection pooling
        connection_string = config.database.get_connection_string()
        
        self.engine = create_engine(
            connection_string,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True
        )
        
        # Create session factory
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        self.logger.info("Database writer initialized")
    
    def write_batch(self, readings: List[SensorReading]) -> bool:
        """Write a batch of sensor readings to the database"""
        if not readings:
            return True
        
        session = self.SessionLocal()
        try:
            # Convert to database objects
            db_objects = [
                SensorReadingModel(
                    timestamp=reading.timestamp,
                    device_id=reading.device_id,
                    sensor_type=reading.sensor_type,
                    value=reading.value,
                    metadata=reading.metadata
                )
                for reading in readings
            ]
            
            # Bulk insert
            session.bulk_save_objects(db_objects)
            session.commit()
            
            self.logger.debug(f"Wrote {len(readings)} readings to database")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to write batch: {e}")
            session.rollback()
            return False
        finally:
            session.close()
    
    def health_check(self) -> bool:
        """Check if database connection is healthy"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(select(1))
                return result.fetchone()[0] == 1
        except Exception as e:
            self.logger.error(f"Database health check failed: {e}")
            return False
    
    def close(self):
        """Close database engine and all connections"""
        if hasattr(self, 'engine') and self.engine:
            self.engine.dispose()
            self.logger.info("Database engine closed")
