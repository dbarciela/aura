package com.example.llamaproxy.pipeline;

public interface ProxyPlugin {
    /**
     * Process the request before it is sent to the target server.
     * Can mutate the request payload, or block the thread (e.g., for manual editing).
     * If the plugin marks the context as dropped, the pipeline will abort.
     */
    void processRequest(RequestContext context);

    /**
     * Process the response after it is received from the target server.
     */
    void processResponse(ResponseContext context);
}
