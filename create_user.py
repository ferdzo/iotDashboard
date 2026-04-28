#!/usr/bin/env python3
"""
Create initial admin user for IoT Dashboard.
Run this script once after running the database migration.

Usage:
    python create_user.py
    
Or with custom credentials:
    python create_user.py --username admin --password yourpassword --email admin@example.com
"""

import os
import sys
import secrets
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings before importing make_password (but don't call setup)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'iotDashboard.settings')

# Import Django settings and configure password hasher manually
from django.conf import settings
if not settings.configured:
    from iotDashboard.settings import *
    settings.configure(
        PASSWORD_HASHERS=[
            'django.contrib.auth.hashers.PBKDF2PasswordHasher',
            'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
            'django.contrib.auth.hashers.Argon2PasswordHasher',
            'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
        ],
        SECRET_KEY=SECRET_KEY,
    )

from django.contrib.auth.hashers import make_password

from db_migrations.models import User

def create_user(username: str, password: str, email: str):
    """Create a new user in the database."""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable not set")
        print("Example: export DATABASE_URL='postgresql://user:pass@localhost:5432/iot_data'")
        sys.exit(1)
    
    # Create database connection
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"Error: User '{username}' already exists")
            sys.exit(1)
        
        # Create new user
        user = User(
            id=secrets.token_urlsafe(8),
            username=username,
            email=email,
            password_hash=make_password(password),
            is_active=True
        )
        
        db.add(user)
        db.commit()
        
        print("✓ User created successfully!")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  ID: {user.id}")
        print("\nYou can now log in at http://localhost:5173/login")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        sys.exit(1)
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description='Create IoT Dashboard user')
    parser.add_argument('--username', default='admin', help='Username (default: admin)')
    parser.add_argument('--password', default='admin123', help='Password (default: admin123)')
    parser.add_argument('--email', default='admin@example.com', help='Email (default: admin@example.com)')
    
    args = parser.parse_args()
    
    print("Creating IoT Dashboard user...")
    print(f"Username: {args.username}")
    print(f"Email: {args.email}")
    print()
    
    create_user(args.username, args.password, args.email)

if __name__ == "__main__":
    main()
