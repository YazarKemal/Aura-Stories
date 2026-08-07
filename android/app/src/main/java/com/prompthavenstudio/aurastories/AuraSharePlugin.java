package com.prompthavenstudio.aurastories;

import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "AuraShare")
public class AuraSharePlugin extends Plugin {

    @PluginMethod
    public void shareInstagramStory(PluginCall call) {
        String dataUrl = call.getString("dataUrl");
        if (dataUrl == null || dataUrl.isEmpty()) {
            call.reject("Paylaşılacak görsel bulunamadı.");
            return;
        }

        try {
            String base64 = dataUrl;
            int comma = dataUrl.indexOf(',');
            if (comma >= 0) {
                base64 = dataUrl.substring(comma + 1);
            }

            byte[] bytes = Base64.decode(base64.getBytes(StandardCharsets.UTF_8), Base64.DEFAULT);
            File shareDir = new File(getContext().getCacheDir(), "aura-shares");
            if (!shareDir.exists() && !shareDir.mkdirs()) {
                call.reject("Paylaşım önbelleği oluşturulamadı.");
                return;
            }

            File image = new File(shareDir, "aura-story-" + System.currentTimeMillis() + ".png");
            try (FileOutputStream output = new FileOutputStream(image)) {
                output.write(bytes);
                output.flush();
            }

            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                image
            );

            Intent instagram = new Intent("com.instagram.share.ADD_TO_STORY");
            instagram.setDataAndType(uri, "image/png");
            instagram.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            instagram.setPackage("com.instagram.android");

            try {
                getContext().grantUriPermission(
                    "com.instagram.android",
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
                getActivity().startActivity(instagram);
                JSObject result = new JSObject();
                result.put("target", "instagram_story");
                call.resolve(result);
                return;
            } catch (Exception ignored) {
                // Instagram yoksa veya Story intent'i desteklenmiyorsa Android paylaşım menüsüne düş.
            }

            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("image/png");
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(share, "Aura Stories ile paylaş"));

            JSObject result = new JSObject();
            result.put("target", "android_share_sheet");
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Görsel paylaşılamadı: " + exception.getMessage(), exception);
        }
    }
}
