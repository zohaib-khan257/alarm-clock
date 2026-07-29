import json

from django.http import JsonResponse
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.shortcuts import render, get_object_or_404

from .models import Alarm


class AlarmPageView(View):
    """Render the main page with SSR alarm list and embedded JSON for JS."""

    def get(self, request):
        alarms = Alarm.objects.all()
        context = {
            "alarms": alarms,
            "alarms_json": json.dumps([self._serialize(a) for a in alarms]),
        }
        return render(request, "alarms/index.html", context)

    @staticmethod
    def _serialize(alarm):
        return {
            "id": alarm.pk,
            "time": alarm.time.strftime("%H:%M"),
            "label": alarm.label,
            "repeat": alarm.repeat,
            "enabled": alarm.enabled,
            "snooze_until": alarm.snooze_until.isoformat() if alarm.snooze_until else None,
        }


class AlarmListView(View):
    """Return all alarms as JSON for JS polling / initial load."""

    def get(self, request):
        alarms = Alarm.objects.all()
        data = [AlarmPageView._serialize(a) for a in alarms]
        return JsonResponse({"alarms": data})


class AlarmCreateView(View):
    """Create a new alarm and return updated alarm list as JSON."""

    def post(self, request):
        time_str = request.POST.get("time")
        label = request.POST.get("label", "").strip() or "Alarm"
        repeat = request.POST.get("repeat", Alarm.ONCE)

        if not time_str:
            return JsonResponse({"error": "Time is required"}, status=400)

        from datetime import time as time_obj
        hour, minute = map(int, time_str.split(":"))
        alarm = Alarm.objects.create(
            time=time_obj(hour, minute),
            label=label,
            repeat=repeat,
        )
        return self._alarms_response()

    @staticmethod
    def _alarms_response():
        alarms = Alarm.objects.all()
        data = [AlarmPageView._serialize(a) for a in alarms]
        return JsonResponse({"alarms": data})


class AlarmToggleView(View):
    """Toggle an alarm's enabled state."""

    def post(self, request, pk):
        alarm = get_object_or_404(Alarm, pk=pk)
        alarm.enabled = not alarm.enabled
        alarm.snooze_until = None  # clear snooze on toggle
        alarm.save(update_fields=["enabled", "snooze_until"])
        return JsonResponse({"alarms": [AlarmPageView._serialize(alarm)]})


class AlarmDeleteView(View):
    """Delete an alarm and return updated list."""

    def post(self, request, pk):
        alarm = get_object_or_404(Alarm, pk=pk)
        alarm.delete()
        alarms = Alarm.objects.all()
        data = [AlarmPageView._serialize(a) for a in alarms]
        return JsonResponse({"alarms": data})


class AlarmSnoozeView(View):
    """Snooze an alarm for 5 minutes from now."""

    def post(self, request, pk):
        alarm = get_object_or_404(Alarm, pk=pk)
        alarm.snooze_until = timezone.now() + timezone.timedelta(minutes=5)
        alarm.enabled = True
        alarm.save(update_fields=["snooze_until", "enabled"])
        return JsonResponse({"alarms": [AlarmPageView._serialize(alarm)]})
