package io.github.dbarciela.aura.pipeline.plugins.benchmark;

import io.github.dbarciela.aura.pipeline.plugins.PromptTransformerPlugin;
import io.github.dbarciela.aura.config.PluginSettingsManager;
import io.github.dbarciela.aura.pipeline.RequestContext;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import java.util.List;
import java.util.ArrayList;

public class PromptTransformerPluginBenchmarkTest {

    @Test
    public void testBenchmark() {
        PluginSettingsManager settingsManager = mock(PluginSettingsManager.class);

        PromptTransformerPlugin.TransformerSettings settings = new PromptTransformerPlugin.TransformerSettings();
        for (int i = 0; i < 10; i++) {
            settings.promptReplaceRules.add(new PromptTransformerPlugin.PromptReplaceRule("regex" + i + "[0-9]+", "replacement" + i));
            settings.responseReplaceRules.add(new PromptTransformerPlugin.PromptReplaceRule("response" + i + "[a-z]+", "repl" + i));
        }

        when(settingsManager.getSettingsAs("prompt-transformer",
                PromptTransformerPlugin.TransformerSettings.class)).thenReturn(settings);

        PromptTransformerPlugin plugin = new PromptTransformerPlugin(settingsManager);

        String payload = "This is a test payload that has regex12345 inside it and maybe response5abc as well. " + "A".repeat(1000);

        long start = System.nanoTime();
        int iterations = 10000;
        for (int i = 0; i < iterations; i++) {
            RequestContext requestContext = new RequestContext(HttpMethod.POST, "http://localhost",
                new HttpHeaders(), payload);
            plugin.processRequest(requestContext);
        }
        long end = System.nanoTime();
        System.out.println("Benchmark time: " + (end - start) / 1_000_000.0 + " ms");
    }
}
