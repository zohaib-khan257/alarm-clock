from django.contrib import admin

from .models import Alarm


@admin.register(Alarm)
class AlarmAdmin(admin.ModelAdmin):
    list_display = ["label", "time", "repeat", "enabled", "snooze_until", "created_at"]
