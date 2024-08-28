from django.http import HttpResponse, request, JsonResponse
from django.db import connections
from django.shortcuts import render, redirect, get_object_or_404
from .models import Device
from .forms import DeviceForm



def fetch_device_data(request):
    device = request.GET.get('device', 'livingroom')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    query = """
            SELECT time, temperature, humidity
            FROM conditions
            WHERE device = %s
        """
    params = [device]

    if start_date:
        query += " AND time >= %s"
        params.append(start_date)

    if end_date:
        query += " AND time <= %s"
        params.append(end_date)

    with connections["data"].cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    times = [row[0].strftime('%Y-%m-%d %H:%M:%S') for row in rows]
    temperatures = [row[1] for row in rows]
    humidities = [row[2] for row in rows]

    return JsonResponse({
        'times': times,
        'temperatures': temperatures,
        'humidities': humidities,
    })
def chart(request):
    devices = Device.objects.all()
    context = {'devices': devices}
    return render(request, 'chart.html', context)

def index(request):
    if request.user.is_authenticated:
        return HttpResponse(chart())
    return HttpResponse("NOT AUTHENTICATED!!!")
def device_list(request):
    devices = Device.objects.all()
    return render(request, 'device_list.html', {'devices': devices})

def add_device(request):
    if request.method == 'POST':
        form = DeviceForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('device_list')
    else:
        form = DeviceForm()
    return render(request, 'device_form.html', {'form': form})

def edit_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == 'POST':
        form = DeviceForm(request.POST, instance=device)
        if form.is_valid():
            form.save()
            return redirect('device_list')
    else:
        form = DeviceForm(instance=device)
    return render(request, 'device_form.html', {'form': form})

def delete_device(request, pk):
    device = get_object_or_404(Device, pk=pk)
    if request.method == 'POST':
        device.delete()
        return redirect('device_list')
    return render(request, 'device_confirm_delete.html', {'device': device})

def login_view():
    pass
def logout_view():
    pass