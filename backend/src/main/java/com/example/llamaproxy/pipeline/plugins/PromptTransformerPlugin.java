package com.example.llamaproxy.pipeline.plugins;

import com.example.llamaproxy.config.ProxySettings;
import com.example.llamaproxy.pipeline.ProxyPlugin;
import com.example.llamaproxy.pipeline.RequestContext;
import com.example.llamaproxy.pipeline.ResponseContext;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Order(1) // Run before ManualEditorPlugin which is Order(2)
public class PromptTransformerPlugin implements ProxyPlugin {

    private final ProxySettings settings;

    public PromptTransformerPlugin(ProxySettings settings) {
        this.settings = settings;
    }

    @Override
    public void processRequest(RequestContext context) {
        String regex = settings.getPromptReplaceRegex();
        String replacement = settings.getPromptReplaceWith();

        if (regex != null && !regex.isEmpty()) {
            try {
                if (context.getPayload() != null) {
                    Pattern pattern = Pattern.compile(regex);
                    Matcher matcher = pattern.matcher(context.getPayload());
                    
                    if (matcher.find()) {
                        String newPayload = matcher.replaceAll(replacement == null ? "" : replacement);
                        context.setPayload(newPayload);
                    }
                }
            } catch (Exception e) {
                // Ignore regex compilation errors or replacement errors during runtime
            }
        }
    }

    @Override
    public void processResponse(ResponseContext context) {
        // No-op for responses in this plugin
    }
}
