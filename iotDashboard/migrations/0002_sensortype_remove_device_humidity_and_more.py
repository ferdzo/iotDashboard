# Generated by Django 4.2.5 on 2024-10-08 10:51

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('iotDashboard', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SensorType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('unit', models.CharField(max_length=20)),
                ('protocol', models.CharField(choices=[('mqtt', 'MQTT'), ('http', 'HTTP')], max_length=20)),
                ('topic', models.CharField(blank=True, max_length=100, null=True)),
                ('endpoint', models.CharField(blank=True, max_length=100, null=True)),
            ],
        ),
        migrations.RemoveField(
            model_name='device',
            name='humidity',
        ),
        migrations.RemoveField(
            model_name='device',
            name='temperature',
        ),
        migrations.AlterField(
            model_name='device',
            name='protocol',
            field=models.CharField(choices=[('mqtt', 'MQTT'), ('http', 'HTTP')], max_length=20),
        ),
        migrations.CreateModel(
            name='Sensor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('enabled', models.BooleanField(default=True)),
                ('device', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sensors', to='iotDashboard.device')),
                ('type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='iotDashboard.sensortype')),
            ],
        ),
    ]