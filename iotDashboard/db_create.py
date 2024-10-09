import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Define your database connection parameters
DATABASE_NAME = os.getenv('DB_NAME', 'example')
USER = os.getenv('DB_USER', 'postgres')
PASSWORD = os.getenv('DB_PASSWORD', 'coolermaster')
HOST = os.getenv('DB_HOST', '10.10.0.1')
PORT = os.getenv('DB_PORT', '5555')

def create_sensor_readings_table():
    """Create the sensor_readings table if it does not exist."""
    try:
        # Establish connection to the database
        conn = psycopg2.connect(
            dbname=DATABASE_NAME,
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT
        )

        with conn.cursor() as cursor:
            # SQL command to create the sensor_readings table
            create_table_query = """
            CREATE TABLE IF NOT EXISTS sensor_readings (
                time TIMESTAMPTZ NOT NULL,
                device_name VARCHAR(255) NOT NULL,  -- Use device_name as a string
                metric VARCHAR(50) NOT NULL,          -- Type of sensor
                value DOUBLE PRECISION NOT NULL,      -- The sensor's value
                PRIMARY KEY (time, device_name, metric)  -- Composite primary key
            );
            """
            cursor.execute(create_table_query)
            print("Table 'sensor_readings' created or already exists.")

        # Commit changes
        conn.commit()

    except Exception as e:
        print(f"Error during database operations: {e}")

    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    create_sensor_readings_table()