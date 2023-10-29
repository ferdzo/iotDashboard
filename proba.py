import psycopg2
from psycopg2 import sql
from datetime import datetime
import requests
from huey import SqliteHuey, crontab

# Initialize scheduler
huey = SqliteHuey(filename='demo.db')

# Database connection
CONNECTION = "postgres://postgres:postgres*@localhost:5432/example"
conn = psycopg2.connect(CONNECTION)

# Devices
devices = {"livingroom": "192.168.1.56","bedroom":"192.168.1.57"}


# Func for fetching data from device using REST API
def fetch_data_from_device(device):
    data = dict()
    data["time"] = datetime.now()
    data["device"] = device
    r = requests.get("http://" + devices[device] + "/sensor/temperature")
    data["temperature"] = r.json()['value']
    r = requests.get("http://" + devices[device] + "/sensor/humidity")
    data["humidity"] = r.json()['value']
    return (data["time"], data["device"], data["temperature"], data["humidity"])


# Func for inserting data to database
def insert_data(conn, device):
    data = fetch_data_from_device(device)
    cursor = conn.cursor()
    insert_query = sql.SQL(
        "INSERT INTO conditions (time, device, temperature, humidity) "
        "VALUES (%s, %s, %s, %s)"
    )
    cursor.execute(insert_query, data)
    conn.commit()
    cursor.close()
    print("Done")


@huey.periodic_task(crontab(minute='*/1'))
def test():
    for device in devices:
        insert_data(conn, device)
