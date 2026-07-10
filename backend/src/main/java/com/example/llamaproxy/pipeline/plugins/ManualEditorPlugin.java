package com.example.llamaproxy.pipeline.plugins;

import com.example.llamaproxy.config.ProxySettings;
import com.example.llamaproxy.pipeline.ProxyPlugin;
import com.example.llamaproxy.pipeline.RequestContext;
import com.example.llamaproxy.pipeline.ResponseContext;
import com.example.llamaproxy.pipeline.QueueItemDTO;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;

@Component
@Order(2)
public class ManualEditorPlugin implements ProxyPlugin {

    private final ProxySettings settings;
    private final com.example.llamaproxy.pipeline.NotificationService notificationService;
    private final ConcurrentHashMap<String, Object> queue = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CountDownLatch> latches = new ConcurrentHashMap<>();
    private final List<String> order = new ArrayList<>(); // To maintain custom order if needed

    public ManualEditorPlugin(ProxySettings settings, com.example.llamaproxy.pipeline.NotificationService notificationService) {
        this.settings = settings;
        this.notificationService = notificationService;
    }

    private void notifyIfUnread() {
        if (!"intercept".equals(notificationService.getActiveTab())) {
            if (!notificationService.hasUnreadNotification("interceptor")) {
                com.example.llamaproxy.pipeline.NotificationDTO n = new com.example.llamaproxy.pipeline.NotificationDTO();
                n.setSourcePlugin("interceptor");
                n.setTitle("Request Intercepted");
                n.setMessage("A request or response has been paused and is waiting for your manual review.");
                n.setLevel("warning");
                n.setActions(List.of(new com.example.llamaproxy.pipeline.NotificationDTO.NotificationAction("Review Request", null, null, "intercept")));
                notificationService.addNotification(n);
            }
        }
    }

    @Override
    public void processRequest(RequestContext context) {
        if (!settings.isInterceptRequests()) {
            return;
        }
        
        String regex = settings.getInterceptRegex();
        if (regex != null && !regex.isEmpty()) {
            try {
                if (context.getPayload() == null || !java.util.regex.Pattern.compile(regex).matcher(context.getPayload()).find()) {
                    return; // Skip intercept if regex doesn't match
                }
            } catch (Exception e) {
                // Invalid regex, skip intercept to be safe
                return;
            }
        }

        String id = context.getId() + "-req";
        queue.put(id, context);
        notifyIfUnread();
        CountDownLatch latch = new CountDownLatch(1);
        latches.put(id, latch);
        synchronized (order) {
            order.add(id);
        }

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            context.setDropped(true);
        } finally {
            queue.remove(id);
            latches.remove(id);
            synchronized (order) {
                order.remove(id);
            }
        }
    }

    @Override
    public void processResponse(ResponseContext context) {
        if (!settings.isInterceptResponses()) {
            return;
        }

        boolean shouldIntercept = false;

        // 1. Invalid JSON check
        if (settings.isInterceptInvalidJson() && context.getPayload() != null) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.readTree(context.getPayload());
            } catch (Exception e) {
                // Not valid JSON
                shouldIntercept = true;
            }
        }

        // 2. Regex check
        if (!shouldIntercept) {
            String regex = settings.getInterceptRegex();
            if (regex != null && !regex.isEmpty()) {
                try {
                    if (context.getPayload() != null && java.util.regex.Pattern.compile(regex).matcher(context.getPayload()).find()) {
                        shouldIntercept = true;
                    }
                } catch (Exception e) {
                    // Invalid regex, skip
                }
            }
        }

        if (!shouldIntercept) {
            return;
        }

        String id = context.getRequestContext().getId() + "-res";
        queue.put(id, context);
        notifyIfUnread();
        CountDownLatch latch = new CountDownLatch(1);
        latches.put(id, latch);
        synchronized (order) {
            order.add(id);
        }

        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            context.getRequestContext().setDropped(true);
        } finally {
            queue.remove(id);
            latches.remove(id);
            synchronized (order) {
                order.remove(id);
            }
        }
    }

    // --- Methods for the UI Control API ---

    public List<QueueItemDTO> getQueue() {
        List<QueueItemDTO> currentQueue = new ArrayList<>();
        synchronized (order) {
            for (String id : order) {
                Object ctx = queue.get(id);
                if (ctx instanceof RequestContext) {
                    RequestContext rCtx = (RequestContext) ctx;
                    currentQueue.add(new QueueItemDTO(id, rCtx.getMethod(), rCtx.getUri(), rCtx.getPayload(), "REQ"));
                } else if (ctx instanceof ResponseContext) {
                    ResponseContext resCtx = (ResponseContext) ctx;
                    RequestContext rCtx = resCtx.getRequestContext();
                    currentQueue.add(new QueueItemDTO(id, rCtx.getMethod(), rCtx.getUri(), resCtx.getPayload(), "RES"));
                }
            }
        }
        return currentQueue;
    }

    public void release(String id, String updatedPayload) {
        Object ctx = queue.get(id);
        if (ctx instanceof RequestContext) {
            ((RequestContext) ctx).setPayload(updatedPayload);
        } else if (ctx instanceof ResponseContext) {
            ((ResponseContext) ctx).setPayload(updatedPayload);
        }
        CountDownLatch latch = latches.get(id);
        if (latch != null) {
            latch.countDown();
        }
    }

    public void drop(String id) {
        Object ctx = queue.get(id);
        if (ctx instanceof RequestContext) {
            ((RequestContext) ctx).setDropped(true);
        } else if (ctx instanceof ResponseContext) {
            ((ResponseContext) ctx).getRequestContext().setDropped(true);
        }
        CountDownLatch latch = latches.get(id);
        if (latch != null) {
            latch.countDown();
        }
    }

    public void reorder(List<String> newOrder) {
        synchronized (order) {
            order.clear();
            order.addAll(newOrder);
        }
    }
}
