from django.urls import path

from . import views

urlpatterns = [
    path("", views.AlarmPageView.as_view(), name="alarm_page"),
    path("api/alarms/", views.AlarmListView.as_view(), name="alarm_list"),
    path("api/alarms/create/", views.AlarmCreateView.as_view(), name="alarm_create"),
    path("api/alarms/<int:pk>/toggle/", views.AlarmToggleView.as_view(), name="alarm_toggle"),
    path("api/alarms/<int:pk>/delete/", views.AlarmDeleteView.as_view(), name="alarm_delete"),
    path("api/alarms/<int:pk>/snooze/", views.AlarmSnoozeView.as_view(), name="alarm_snooze"),
]
