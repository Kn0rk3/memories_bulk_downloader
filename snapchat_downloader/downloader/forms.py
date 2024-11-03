from django import forms
from .models import MemoryUpload

class MemoryUploadForm(forms.ModelForm):
    class Meta:
        model = MemoryUpload
        fields = ['file']
