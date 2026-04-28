"""
Dashboard layout models for persistent storage in PostgreSQL.

Single-user system: Stores dashboard configuration for the default user.
PostgreSQL is chosen over Redis because:
- Dashboard layouts are persistent configuration data (not cache)
- Need ACID guarantees for data integrity
- Low read/write frequency (performance difference negligible)
- Already using PostgreSQL for Django
"""

from django.db import models
from django.utils import timezone


class DashboardLayout(models.Model):
    """Stores dashboard configuration in PostgreSQL.
    
    Single-user system: Only one default layout is stored.
    This is persistent configuration data that should survive server restarts.
    PostgreSQL provides:
    - ACID guarantees
    - Complex queries
    - Backup/restore capabilities
    """
    
    name = models.CharField(
        max_length=255,
        default='default',
        unique=True,
        help_text="Layout name (e.g., 'default', 'mobile', 'work')"
    )
    config = models.JSONField(
        help_text="Full dashboard configuration JSON"
    )
    is_default = models.BooleanField(
        default=True,
        help_text="Whether this is the default layout"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "dashboard_layouts"
        indexes = [
            models.Index(fields=["is_default"]),
            models.Index(fields=["name"]),
        ]
    
    def __str__(self):
        return f"{self.name} (default: {self.is_default})"
    
    @classmethod
    def get_default(cls):
        """Get the default layout, or create one if it doesn't exist."""
        layout = cls.objects.filter(is_default=True).first()
        if layout:
            return layout
        # Create default if none exists
        return cls.objects.create(
            name='default',
            config={'widgets': [], 'layout': 'grid', 'refreshInterval': 30000},
            is_default=True
        )

