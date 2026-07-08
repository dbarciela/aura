package com.example.llamaproxy.pipeline.plugins;

import com.example.llamaproxy.pipeline.ProxyPlugin;
import com.example.llamaproxy.pipeline.RequestContext;
import com.example.llamaproxy.pipeline.ResponseContext;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class FormatFixerPlugin implements ProxyPlugin {

    @Override
    public void processRequest(RequestContext context) {
        // Pass-through implementation for now.
        // Future-proofing for automated JSON schema fixes.
    }

    @Override
    public void processResponse(ResponseContext context) {
        // Pass-through
    }
}
