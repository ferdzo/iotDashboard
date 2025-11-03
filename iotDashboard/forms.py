"""
Django forms for the IoT Dashboard.

Note: Device registration is handled through the device_manager API.
These forms are used for the legacy Django UI only.
"""

from django import forms
from iotDashboard.models import Device


class DeviceForm(forms.ModelForm):
    """
    Form for creating/editing devices.
    
    Note: This is for the Django UI only. Actual device registration
    happens through the device_manager microservice API.
    """
    
    protocol = forms.ChoiceField(
        choices=[
            ("mqtt", "MQTT"),
            ("http", "HTTP"),
            ("webhook", "Webhook"),
        ],
        initial="mqtt",
        help_text="Communication protocol for this device",
    )
    
    class Meta:
        model = Device
        fields = ["name", "location", "protocol"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control", "placeholder": "Device name"}),
            "location": forms.TextInput(attrs={"class": "form-control", "placeholder": "Device location (optional)"}),
        }
        help_texts = {
            "name": "Unique identifier for this device",
            "location": "Physical location or description",
        }
