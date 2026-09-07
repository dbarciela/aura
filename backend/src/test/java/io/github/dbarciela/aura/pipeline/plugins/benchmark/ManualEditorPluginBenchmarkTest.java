package io.github.dbarciela.aura.pipeline.plugins.benchmark;

import io.github.dbarciela.aura.pipeline.plugins.ManualEditorPlugin;
import io.github.dbarciela.aura.config.PluginSettingsManager;
import io.github.dbarciela.aura.pipeline.NotificationService;
import io.github.dbarciela.aura.pipeline.ResponseContext;
import io.github.dbarciela.aura.pipeline.RequestContext;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.util.ArrayList;

public class ManualEditorPluginBenchmarkTest {

    @Test
    public void testBenchmark() {
        PluginSettingsManager settingsManager = mock(PluginSettingsManager.class);
        NotificationService notificationService = mock(NotificationService.class);

        ManualEditorPlugin.ManualEditorSettings settings = new ManualEditorPlugin.ManualEditorSettings();
        settings.enabled = true;

        settings.interceptRegexRules = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            settings.interceptRegexRules.add("regex" + i + "[0-9]+");
        }
        // This will prevent latch.await() from blocking the thread since shouldIntercept will be false
        // Oh wait, if it matches, it WILL block. Let's make sure it DOES NOT match to test just the regex processing performance
        // Actually, if we test with regexes that don't match, it has to evaluate all of them!
        settings.interceptRegexRules.add("never_matching_regex_xyz");

        when(settingsManager.getSettingsAs("manual-editor",
                ManualEditorPlugin.ManualEditorSettings.class)).thenReturn(settings);

        ManualEditorPlugin plugin = new ManualEditorPlugin(settingsManager, notificationService);

        String payload = "This is a test payload that has nothing to do with regexes. " + "A".repeat(1000);

        long start = System.nanoTime();
        int iterations = 10000;
        for (int i = 0; i < iterations; i++) {
            RequestContext req = new RequestContext(HttpMethod.POST, "http://localhost", new HttpHeaders(), payload);
            ResponseContext context = new ResponseContext(req, 200, new HttpHeaders(), payload);
            plugin.processResponse(context);
        }
        long end = System.nanoTime();
        System.out.println("Benchmark time: " + (end - start) / 1_000_000.0 + " ms");
    }
}
