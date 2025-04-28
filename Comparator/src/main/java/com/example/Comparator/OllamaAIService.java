package com.example.Comparator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.time.Duration;

@Service
public class OllamaAIService {

    private final WebClient webClient = WebClient.builder()
            .baseUrl("http://localhost:11434")
            // Set longer timeout for LLM processing (60 seconds)
            .codecs(configurer -> configurer
                    .defaultCodecs()
                    .maxInMemorySize(16 * 1024 * 1024)) // 16MB buffer
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Mono<AIResponse> generateResponse(String model, String prompt) {
        final long startTime = System.currentTimeMillis();

        return webClient.post()
                .uri("/api/generate")
                .header("Content-Type", "application/json")
                .bodyValue(buildRequest(model, prompt))
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(60)) // 60 second timeout
                .map(response -> {
                    long endTime = System.currentTimeMillis();
                    long processingTime = endTime - startTime;

                    return processResponse(response, processingTime);
                })
                .onErrorResume(e -> {
                    long endTime = System.currentTimeMillis();
                    long errorTime = endTime - startTime;

                    return Mono.just(new AIResponse(
                            "Error: " + e.getMessage(),
                            0,
                            errorTime
                    ));
                });
    }

    private String buildRequest(String model, String prompt) {
        // Escape JSON properly
        String escapedPrompt = prompt.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");

        return String.format(
                "{\"model\":\"%s\",\"prompt\":\"%s\",\"stream\":false}",
                model,
                escapedPrompt
        );
    }

    private AIResponse processResponse(String rawResponse, long totalTime) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            String text = root.path("response").asText();

            // Extract tokens used from API response
            int tokensUsed = 0;
            if (!root.path("usage").path("total_tokens").isMissingNode()) {
                tokensUsed = root.path("usage").path("total_tokens").asInt();
            } else if (!root.path("total_tokens").isMissingNode()) {
                tokensUsed = root.path("total_tokens").asInt();
            } else if (!root.path("prompt_tokens").isMissingNode() && !root.path("completion_tokens").isMissingNode()) {
                // Some APIs report tokens separately
                int promptTokens = root.path("prompt_tokens").asInt();
                int completionTokens = root.path("completion_tokens").asInt();
                tokensUsed = promptTokens + completionTokens;
            } else {
                // Estimate tokens if not provided by API (~4 chars per token)
                tokensUsed = Math.max(1, text.length() / 4);
            }

            return new AIResponse(text, tokensUsed, totalTime);
        } catch (Exception e) {
            return new AIResponse(
                    "Error parsing response: " + e.getMessage(),
                    0,
                    totalTime
            );
        }
    }

    public static class AIResponse {
        private final String text;
        private final int tokensUsed;
        private final long timeTaken;

        public AIResponse(String text, int tokensUsed, long timeTaken) {
            this.text = text;
            this.tokensUsed = tokensUsed;
            this.timeTaken = timeTaken;
        }

        public String getText() {
            return text;
        }

        public int getTokensUsed() {
            return tokensUsed;
        }

        public long getTimeTaken() {
            return timeTaken;
        }
    }
}