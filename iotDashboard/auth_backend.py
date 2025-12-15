"""
Custom authentication backend for IoT Dashboard.
Uses the custom users table instead of Django's auth_user table.
"""

from django.contrib.auth.hashers import check_password
from django.contrib.auth.backends import BaseBackend
from iotDashboard.models import User


class CustomUserBackend(BaseBackend):
    """
    Custom authentication backend that uses our users table.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        """
        Authenticate user against our custom users table.
        """
        if username is None or password is None:
            return None
        
        try:
            user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return None
        
        # Verify password
        if check_password(password, user.password_hash):
            # Create a minimal user-like object that JWT can use
            # We need to add required attributes for JWT
            user.is_authenticated = True
            user.pk = user.id  # JWT expects pk attribute
            return user
        
        return None
    
    def get_user(self, user_id):
        """
        Get user by ID for session/JWT validation.
        """
        try:
            user = User.objects.get(pk=user_id, is_active=True)
            user.is_authenticated = True
            user.pk = user.id
            return user
        except User.DoesNotExist:
            return None
