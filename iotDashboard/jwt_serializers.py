"""
Custom JWT serializers for IoT Dashboard.
Handles string-based user IDs instead of integer IDs.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that handles string user IDs.
    """
    
    @classmethod
    def get_token(cls, user):
        token = RefreshToken.for_user(user)
        
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        
        return token
