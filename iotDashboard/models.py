from django.db import models

class Device(models.Model):
    name = models.CharField(max_length=50)
    ip = models.CharField(max_length=20)
    protocol = models.CharField(max_length=20)
    temperature = models.BooleanField(default=False)
    humidity = models.BooleanField(default=False)
    brightness = models.BooleanField(default=False)




class Measurement(models.Model):
    temperature = models.CharField(required=False,max_length=10)
    humidity = models.CharField(required=False,max_length=10)
    brightness = models.CharField(required=False,max_length=10)
