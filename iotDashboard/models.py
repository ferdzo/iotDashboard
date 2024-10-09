from django.db import models

class   SensorType(models.Model):
    name = models.CharField(max_length=50, unique=True)  # Sensor name, e.g., "CO2", "Noise", etc.
    unit = models.CharField(max_length=20)  # Unit of measurement, e.g., "ppm", "dB", "lux"
    protocol = models.CharField(max_length=20, choices=[('mqtt', 'MQTT'), ('http', 'HTTP')])  # Protocol for communication
    topic = models.CharField(max_length=100, null=True, blank=True)  # Topic for MQTT communication
    endpoint = models.CharField(max_length=100, null=True, blank=True)  # Endpoint for HTTP communication

    def __str__(self):
        return f"{self.name} ({self.unit})"

class Device(models.Model):
    name = models.CharField(max_length=50)  # Device name
    ip = models.CharField(max_length=20)  # Device IP address
    protocol = models.CharField(max_length=20, choices=[('mqtt', 'MQTT'), ('http', 'HTTP')])

    def __str__(self):
        return self.name

class Sensor(models.Model):
    device = models.ForeignKey(Device, related_name='sensors', on_delete=models.CASCADE)
    type = models.ForeignKey(SensorType, on_delete=models.CASCADE)
    enabled = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.type.name} Sensor on {self.device.name}"
