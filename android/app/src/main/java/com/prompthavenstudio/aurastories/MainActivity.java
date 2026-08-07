package com.prompthavenstudio.aurastories;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
