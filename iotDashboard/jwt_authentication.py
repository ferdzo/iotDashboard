"""
JWT authentication against the custom users table (string primary keys).

SimpleJWT's default JWTAuthentication resolves the token user_id against
Django's auth.User (integer PK) and raises on our string IDs, so every
authenticated request 500s. This resolves against iotDashboard.User instead.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication

from iotDashboard.models import User


class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token["user_id"]
        except KeyError:
            return None

        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return None

        user.is_authenticated = True
        return user
