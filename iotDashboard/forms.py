from django import forms
from .models import Device, Sensor, SensorType

# Form for adding/editing devices
class DeviceForm(forms.ModelForm):
    class Meta:
        model = Device
        fields = ['name', 'ip', 'protocol']  # Fields based on your Device model
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'ip': forms.TextInput(attrs={'class': 'form-control'}),
            'protocol': forms.Select(attrs={'class': 'form-control'}),
        }

# Form for adding a sensor with its type, including topic and endpoint for SensorType
class SensorWithTypeForm(forms.ModelForm):
    type = forms.ModelChoiceField(
        queryset=SensorType.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'}),
        label="Sensor Type"
    )

    class Meta:
        model = Sensor
        fields = ['device', 'type', 'enabled']  # Fields from your Sensor model
        widgets = {
            'device': forms.Select(attrs={'class': 'form-control'}),
            'enabled': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def save(self, commit=True):
        sensor = super().save(commit=False)
        if commit:
            sensor.save()
        return sensor

# Form for creating or editing SensorType
class SensorTypeForm(forms.ModelForm):
    class Meta:
        model = SensorType
        fields = ['name', 'unit', 'protocol', 'topic', 'endpoint']  # Fields from your SensorType model
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'unit': forms.TextInput(attrs={'class': 'form-control'}),
            'protocol': forms.Select(attrs={'class': 'form-control'}),
            'topic': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Optional for MQTT'}),
            'endpoint': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Optional for HTTP'}),
        }
