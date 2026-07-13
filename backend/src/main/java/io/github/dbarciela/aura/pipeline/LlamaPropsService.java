package io.github.dbarciela.aura.pipeline;

import java.util.Map;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class LlamaPropsService {

	private static final Logger log = LoggerFactory.getLogger(LlamaPropsService.class);
	private final java.net.http.HttpClient httpClient;
	private final com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
	private final String targetServerUrl;
	private final LiveChatBroadcaster broadcaster;

	private Integer cachedContextLimit;

	public LlamaPropsService(@Value("${target.server.url}") String targetServerUrl, LiveChatBroadcaster broadcaster) {
		this.targetServerUrl = targetServerUrl;
		this.broadcaster = broadcaster;
		this.httpClient = java.net.http.HttpClient.newBuilder()
				.connectTimeout(java.time.Duration.ofSeconds(3))
				.build();
	}

	@Scheduled(fixedRate = 10000)
	public void fetchProps() {
		try {
			String baseUrl = targetServerUrl.endsWith("/v1")
					? targetServerUrl.substring(0, targetServerUrl.length() - 3)
					: targetServerUrl;

			java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
					.uri(java.net.URI.create(baseUrl + "/props"))
					.timeout(java.time.Duration.ofSeconds(3))
					.GET()
					.build();

			java.net.http.HttpResponse<String> responseStr = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
			
			if (responseStr.statusCode() >= 200 && responseStr.statusCode() < 300) {
				com.fasterxml.jackson.databind.JsonNode response = mapper.readTree(responseStr.body());
				if (response != null && response.has("default_generation_settings")) {
					com.fasterxml.jackson.databind.JsonNode settings = response.get("default_generation_settings");
					if (settings.has("n_ctx")) {
						cachedContextLimit = settings.get("n_ctx").asInt();
					}
				}
			}
		} catch (Exception e) {
			log.trace("Failed to fetch /props, possibly not supported or offline: {}", e.getMessage());
		}

		if (cachedContextLimit != null) {
			broadcaster.broadcastContextLimit(cachedContextLimit);
		}
	}
}
