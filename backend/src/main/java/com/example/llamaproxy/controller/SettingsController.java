package com.example.llamaproxy.controller;

import com.example.llamaproxy.config.ProxySettings;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proxy")
public class SettingsController {

    private final ProxySettings settings;

    public SettingsController(ProxySettings settings) {
        this.settings = settings;
    }

    @GetMapping("/settings")
    public ProxySettings getSettings() {
        return settings;
    }

    @PutMapping("/settings")
    public ProxySettings updateSettings(@RequestBody ProxySettings newSettings) {
        settings.setInterceptRequests(newSettings.isInterceptRequests());
        settings.setInterceptResponses(newSettings.isInterceptResponses());
        settings.setLoggingEnabled(newSettings.isLoggingEnabled());
        
        settings.setInterceptInvalidJson(newSettings.isInterceptInvalidJson());
        
        if (newSettings.getInterceptRegex() != null) {
            settings.setInterceptRegex(newSettings.getInterceptRegex());
        } else {
            settings.setInterceptRegex("");
        }

        if (newSettings.getPromptReplaceRegex() != null) {
            settings.setPromptReplaceRegex(newSettings.getPromptReplaceRegex());
        } else {
            settings.setPromptReplaceRegex("");
        }

        if (newSettings.getPromptReplaceWith() != null) {
            settings.setPromptReplaceWith(newSettings.getPromptReplaceWith());
        } else {
            settings.setPromptReplaceWith("");
        }

        return settings;
    }
}
