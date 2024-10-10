from django import forms
from .models import Device, Sensor, SensorType


class DeviceForm(forms.ModelForm):
    class Meta:
        model = Device
        fields = ['name', 'ip', 'protocol']  # Exclude sensors from the fields

    def __init__(self, *args, **kwargs):
        # No need to handle sensors in the form
        super(DeviceForm, self).__init__(*args, **kwargs)

    def save(self, commit=True):
        # Save the device instance
        device = super(DeviceForm, self).save(commit=False)

        if commit:
            device.save()

        return device
class SensorWithTypeForm(forms.ModelForm):
    # Add fields for SensorType directly in the form
    type_name = forms.CharField(max_length=50, label="Sensor Type Name")
    unit = forms.CharField(max_length=20, label="Unit", required=False)
    protocol = forms.ChoiceField(
        choices=[('mqtt', 'MQTT'), ('http', 'HTTP')],
        label="Protocol"
    )
    topic = forms.CharField(max_length=100, label="Topic", required=False)
    endpoint = forms.CharField(max_length=100, label="Endpoint", required=False)

    class Meta:
        model = Sensor
        fields = ['enabled']  # Exclude 'device' from the form fields

    def __init__(self, *args, **kwargs):
        self.device = kwargs.pop('device', None)  # Get the device from kwargs
        super(SensorWithTypeForm, self).__init__(*args, **kwargs)

    def save(self, commit=True):
        # Create or get the SensorType
        try:
            sensor_type = SensorType.objects.get(name=self.cleaned_data['type_name'])
        except SensorType.DoesNotExist:
            sensor_type = SensorType(
                name=self.cleaned_data['type_name'],
                unit=self.cleaned_data['unit'],
                protocol=self.cleaned_data['protocol'],
                topic=self.cleaned_data['topic'],
                endpoint=self.cleaned_data['endpoint']
            )
            if commit:
                sensor_type.save()

        # Create Sensor with the SensorType found or created
        sensor = super(SensorWithTypeForm, self).save(commit=False)
        sensor.type = sensor_type
        sensor.device = self.device  # Associate the sensor with the device

        if commit:
            sensor.save()

        return sensor
