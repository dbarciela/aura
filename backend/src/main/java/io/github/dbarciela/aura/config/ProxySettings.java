package io.github.dbarciela.aura.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ProxySettings {
	private boolean loggingEnabled;
	private String defaultTab = "live-chat-plugin";

	public String getDefaultTab() {
		return defaultTab;
	}

	public void setDefaultTab(String defaultTab) {
		this.defaultTab = defaultTab;
	}

	public boolean isLoggingEnabled() {
		return loggingEnabled;
	}

	public void setLoggingEnabled(boolean loggingEnabled) {
		this.loggingEnabled = loggingEnabled;
	}

	@Value("${target.webui.url:}")
	private String webUiUrl;

	public String getWebUiUrl() {
		return webUiUrl;
	}

	public void setWebUiUrl(String webUiUrl) {
		this.webUiUrl = webUiUrl;
	}

	@Value("${aura.schema.url:/openai-schema.json}")
	private String schemaUrl;

	public String getSchemaUrl() {
		return schemaUrl;
	}

	public void setSchemaUrl(String schemaUrl) {
		this.schemaUrl = schemaUrl;
	}
}
