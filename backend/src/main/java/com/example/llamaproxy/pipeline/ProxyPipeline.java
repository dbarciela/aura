package com.example.llamaproxy.pipeline;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class ProxyPipeline {
    
    private final List<ProxyPlugin> plugins;

    public ProxyPipeline(List<ProxyPlugin> plugins) {
        // Spring will automatically inject all beans implementing ProxyPlugin
        // We might want to enforce order using @Order on the plugins.
        this.plugins = plugins;
    }

    public void processRequest(RequestContext context) {
        for (ProxyPlugin plugin : plugins) {
            if (context.isDropped()) {
                break;
            }
            plugin.processRequest(context);
        }
    }

    public void processResponse(ResponseContext context) {
        // For response, we generally run plugins in the same order, or reverse order.
        // We'll run them in the same order for now.
        for (ProxyPlugin plugin : plugins) {
            plugin.processResponse(context);
        }
    }
}
