from django.db import models
class Device(models.Model):
    name = models.CharField(max_length=50)
    ip = models.CharField(max_length=20)
    protocol = models.CharField(max_length=20)
    temperature = models.BooleanField(default=False)
    humidity = models.BooleanField(default=False)

    def __str__(self):
        return self.name