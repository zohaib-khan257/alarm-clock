from django.db import models


class Alarm(models.Model):
    """Represents a single alarm with time, label, repeat mode, and snooze state."""

    ONCE = "once"
    DAILY = "daily"
    REPEAT_CHOICES = [(ONCE, "Once"), (DAILY, "Daily")]

    time = models.TimeField(help_text="HH:MM format")
    label = models.CharField(max_length=100, default="Alarm")
    repeat = models.CharField(max_length=10, choices=REPEAT_CHOICES, default=ONCE)
    enabled = models.BooleanField(default=True)
    snooze_until = models.DateTimeField(null=True, blank=True, help_text="If set, alarm is snoozed until this time")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["time"]

    def __str__(self):
        return f"{self.label} @ {self.time:%H:%M} ({self.repeat})"
