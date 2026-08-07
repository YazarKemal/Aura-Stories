package com.prompthavenstudio.aurastories;

import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "AuraTts")
public class AuraTtsPlugin extends Plugin {
    private TextToSpeech textToSpeech;
    private boolean ready = false;

    @Override
    public void load() {
        textToSpeech = new TextToSpeech(getContext(), status -> {
            ready = status == TextToSpeech.SUCCESS;
            if (ready) {
                int result = textToSpeech.setLanguage(Locale.forLanguageTag("tr-TR"));
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    textToSpeech.setLanguage(Locale.getDefault());
                }
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        Double rateValue = call.getDouble("rate", 1.0);
        String language = call.getString("language", "tr-TR");

        if (!ready || textToSpeech == null) {
            call.reject("Android ses motoru henüz hazır değil.");
            return;
        }
        if (text == null || text.trim().isEmpty()) {
            call.reject("Okunacak metin bulunamadı.");
            return;
        }

        Locale requestedLocale = Locale.forLanguageTag(language == null ? "tr-TR" : language);
        int languageResult = textToSpeech.setLanguage(requestedLocale);
        if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            textToSpeech.setLanguage(Locale.getDefault());
        }

        float rate = rateValue == null ? 1.0f : rateValue.floatValue();
        rate = Math.max(0.5f, Math.min(rate, 2.0f));
        textToSpeech.setSpeechRate(rate);

        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "aura-story");
        if (result == TextToSpeech.ERROR) {
            call.reject("Android ses motoru metni başlatamadı.");
            return;
        }

        JSObject response = new JSObject();
        response.put("speaking", true);
        call.resolve(response);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        JSObject response = new JSObject();
        response.put("speaking", false);
        call.resolve(response);
    }

    @Override
    protected void handleOnPause() {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        ready = false;
    }
}
