package com.prompthavenstudio.aurastories;

import android.os.Build;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AuraSharePlugin.class);
        registerPlugin(AuraTtsPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
    }

    @Override
    public void onBackPressed() {
        if (bridge == null || bridge.getWebView() == null) {
            performDefaultBack();
            return;
        }

        bridge.getWebView().evaluateJavascript(
            "(function(){" +
                "var close=document.querySelector('[role=dialog] button[data-aura-close], [role=dialog] button[aria-label=\"Close\"]');" +
                "if(close){close.click();return 'handled';}" +
                "var back=document.querySelector('button[aria-label=\"Geri dön\"]');" +
                "if(back){back.click();return 'handled';}" +
                "return 'unhandled';" +
            "})()",
            result -> {
                if (!"\"handled\"".equals(result)) {
                    performDefaultBack();
                }
            }
        );
    }

    private void performDefaultBack() {
        super.onBackPressed();
    }
}
