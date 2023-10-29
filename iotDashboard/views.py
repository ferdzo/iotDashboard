from django.http import HttpResponse
from django.db import connections

def my_custom_sql():
    with connections['data'].cursor() as cursor:
        # cursor.execute("SELECT * FROM conditions WHERE device='livingroom';"
        cursor.execute("SELECT * FROM conditions WHERE time > NOW() - INTERVAL '50 days' ;")
        row = cursor.fetchall()
        keys = ("time","device","tempreature","humidity")
    return row




def index(request):
    if request.user.is_authenticated:
        return HttpResponse(my_custom_sql())
    return HttpResponse("NOT AUTHENTICATED!!!")