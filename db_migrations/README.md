# Database Migrations

This directory contains all database schema definitions and migrations for the IoT Dashboard project.

## Quick Start

### 1. Install Dependencies

```bash
pip install alembic sqlalchemy python-dotenv psycopg2-binary
```

### 2. Configure Database

Set `CONNECTION_STRING` or `DATABASE_URL` in the root `.env` file:

```bash
CONNECTION_STRING=postgresql://user:password@localhost:5432/iotdashboard
```

### 3. Create Initial Migration

```bash
chmod +x migrate.sh
./migrate.sh create "initial schema"
```

### 4. Review Migration

Check the generated file in `alembic/versions/`

### 5. Apply Migration

```bash
./migrate.sh upgrade
```

## Usage

### Create a New Migration

After editing `models.py`:

```bash
./migrate.sh create "add new column"
```

### Apply Migrations

```bash
./migrate.sh upgrade
```

### Check Current Version

```bash
./migrate.sh current
```

### View History

```bash
./migrate.sh history
```

### Rollback

```bash
./migrate.sh downgrade 1
```

## File Structure

```
db_migrations/
├── models.py          # SQLAlchemy models (schema definition)
├── alembic.ini        # Alembic configuration
├── alembic/
│   ├── env.py         # Migration environment
│   ├── script.py.mako # Migration template
│   └── versions/      # Generated migrations
├── migrate.sh         # Helper script
└── README.md          # This file
```

## Modifying Schema

1. Edit `models.py` to define your changes
2. Run `./migrate.sh create "description"`
3. Review the generated migration
4. Run `./migrate.sh upgrade`

## Using Models in Services

Services can import models from here:

```python
# In services/db_write/db_writer.py or any other service
import sys
sys.path.insert(0, '/path/to/db_migrations')
from models import SensorReading
```

Or better, use relative imports if properly structured.

## Notes

- The `.env` file should be in the project root (`../.env`)
- Migrations are applied to whatever database is in `CONNECTION_STRING`
- Always review generated migrations before applying
- Keep `models.py` as the single source of truth for schema
